import type {
  AppConfig,
  GenerationResult,
  PeerCallContext,
  PeerId,
  PeerResult,
  TokenUsage,
} from "../core/types.js";
import { estimateCost } from "../core/cost.js";
import { decisionQualityFromStatus, parsePeerStatus } from "../core/status.js";
import { redact } from "../security/redact.js";

// v2.4.0 / audit closure (P2.9): defensive cap on accumulated streaming
// text per peer call. Pre-v2.4.0 every adapter used `text += delta`
// without bound, so a hostile or buggy peer could OOM the orchestrator
// by emitting unbounded tokens. The cap is per-call (not per-session)
// and very generous — 16 MiB is roughly 4M tokens, well above any
// legitimate response. When the cap is exceeded the helper throws a
// retryable error so the retry loop can shorten the prompt instead of
// crashing the process.
export const STREAM_TEXT_MAX_BYTES = 16 * 1024 * 1024;

export class StreamBufferOverflowError extends Error {
  constructor(peer: string, bytes: number) {
    super(
      `${peer} streaming response exceeded ${STREAM_TEXT_MAX_BYTES} bytes (got ${bytes}); aborting to protect the orchestrator from OOM.`,
    );
    this.name = "StreamBufferOverflowError";
  }
}

// v2.4.0 cross-review-v2 R2 (codex): byte-budget pre-check BEFORE
// concatenation. Pre-R2 the helper computed `combined = buffer + delta`
// first and only THEN tested the byte length, so a hostile peer could
// allocate a multi-GB string before triggering the throw — the very OOM
// we are trying to prevent. R2 measures the buffer + delta byte counts
// separately (no allocation beyond the strings already in hand) and
// throws BEFORE the concatenation is materialized.
// v2.4.0 cross-review-v2 R3 (gemini): O(1) per-append byte accounting.
// R2 closed Codex's pre-allocation concern by measuring bytes BEFORE
// concatenation, but Gemini caught the resulting O(N^2) regression —
// `Buffer.byteLength(buffer, "utf8")` rescans the entire accumulated
// string on every delta, so a 16 MiB stream emitted in 100-byte chunks
// pays 16 MiB x 160 000 chunks ~= 2.5 TB of scanning before the cap is
// reached, which DoS-locks the event loop. R3 introduces a stateful
// `StreamBuffer` class that maintains a running byte counter — each
// append measures only the delta (O(deltaLength)) and increments the
// counter, never re-scanning the accumulated text. Adapters use the
// class form; the legacy free-function is kept as a stateless shim.
export class StreamBuffer {
  private buffer = "";
  private bytes = 0;

  constructor(private readonly peer: string) {}

  // Append a delta. Throws StreamBufferOverflowError BEFORE any
  // concatenation if the projected size would exceed the cap.
  // Time complexity: O(delta.length) — independent of accumulated size.
  append(delta: string): string {
    if (!delta) return this.buffer;
    const deltaBytes = Buffer.byteLength(delta, "utf8");
    const projected = this.bytes + deltaBytes;
    if (projected > STREAM_TEXT_MAX_BYTES) {
      throw new StreamBufferOverflowError(this.peer, projected);
    }
    this.buffer += delta;
    this.bytes = projected;
    return this.buffer;
  }

  text(): string {
    return this.buffer;
  }

  byteLength(): number {
    return this.bytes;
  }
}

// Legacy free-function shim. Stateless callers (tests, edge cases) may
// still use it; production adapters MUST use StreamBuffer for O(1)
// amortized cost.
export function appendStreamText(peer: string, buffer: string, delta: string): string {
  if (!delta) return buffer;
  const projected = Buffer.byteLength(buffer, "utf8") + Buffer.byteLength(delta, "utf8");
  if (projected > STREAM_TEXT_MAX_BYTES) {
    throw new StreamBufferOverflowError(peer, projected);
  }
  return buffer + delta;
}

export abstract class BasePeerAdapter {
  abstract id: PeerId;
  abstract provider: string;
  abstract model: string;

  protected constructor(protected readonly config: AppConfig) {}

  private modelMatches(reported?: string): boolean | undefined {
    if (!reported) return undefined;
    const requestedModel = this.normalizeModelId(this.model);
    const reportedModel = this.normalizeModelId(reported);
    if (reportedModel === requestedModel) return true;
    return reportedModel.startsWith(`${requestedModel}-`);
  }

  private normalizeModelId(model: string): string {
    return model.trim().replace(/^models\//i, "");
  }

  protected shouldStreamTokens(context: PeerCallContext): boolean {
    return Boolean(context.stream_tokens && this.config.streaming.tokens);
  }

  protected emitTokenDelta(
    context: PeerCallContext,
    params: { phase: "review" | "generation"; delta: string; source?: string },
  ): void {
    if (!this.shouldStreamTokens(context) || !params.delta) return;
    const data: Record<string, unknown> = {
      phase: params.phase,
      provider: this.provider,
      model: this.model,
      source: params.source ?? "text",
      chars: params.delta.length,
    };
    if (this.config.streaming.include_text) {
      data.delta = redact(params.delta);
    }
    context.emit({
      type: "peer.token.delta",
      session_id: context.session_id,
      round: context.round,
      peer: this.id,
      message: `${this.id} streamed ${params.delta.length} chars.`,
      data,
    });
  }

  protected emitTokenCompleted(
    context: PeerCallContext,
    params: { phase: "review" | "generation"; chars: number },
  ): void {
    if (!this.shouldStreamTokens(context)) return;
    context.emit({
      type: "peer.token.completed",
      session_id: context.session_id,
      round: context.round,
      peer: this.id,
      message: `${this.id} completed token streaming.`,
      data: {
        phase: params.phase,
        provider: this.provider,
        model: this.model,
        chars: params.chars,
      },
    });
  }

  protected resultFromText(params: {
    text: string;
    raw: unknown;
    usage?: TokenUsage;
    started: number;
    attempts: number;
    modelReported?: string;
  }): PeerResult {
    const parsed = parsePeerStatus(params.text);
    const modelMatch = this.modelMatches(params.modelReported);
    const parserWarnings =
      modelMatch === false
        ? [
            ...parsed.parser_warnings,
            `reported model ${params.modelReported} did not match requested model ${this.model}`,
          ]
        : parsed.parser_warnings;
    return {
      peer: this.id,
      provider: this.provider,
      model: this.model,
      model_reported: params.modelReported,
      model_match: modelMatch,
      status: modelMatch === false ? null : parsed.status,
      structured: parsed.structured,
      text: params.text,
      raw: params.raw,
      usage: params.usage,
      cost: estimateCost(this.config, this.id, params.usage),
      latency_ms: Date.now() - params.started,
      attempts: params.attempts,
      parser_warnings: parserWarnings,
      decision_quality:
        modelMatch === false ? "failed" : decisionQualityFromStatus(parsed.status, parserWarnings),
    };
  }

  protected generationFromText(params: {
    text: string;
    raw: unknown;
    usage?: TokenUsage;
    started: number;
    attempts: number;
    modelReported?: string;
  }): GenerationResult {
    const modelMatch = this.modelMatches(params.modelReported);
    return {
      peer: this.id,
      provider: this.provider,
      model: this.model,
      model_reported: params.modelReported,
      model_match: modelMatch,
      text: params.text,
      raw: params.raw,
      usage: params.usage,
      cost: estimateCost(this.config, this.id, params.usage),
      latency_ms: Date.now() - params.started,
      attempts: params.attempts,
    };
  }

  protected systemPrompt(context: PeerCallContext): string {
    return [
      "You are a peer reviewer in cross-review-v2.",
      "Your job is to review the caller's work rigorously and independently.",
      "Do not rubber-stamp. Do not invent evidence.",
      "Unanimity is required: READY only when no blocking issue remains.",
      `Session: ${context.session_id}`,
      `Round: ${context.round}`,
      "Original task:",
      context.task,
    ].join("\n\n");
  }
}
