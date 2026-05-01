import type { PeerFailure, PeerId } from "../core/types.js";
import { safeErrorMessage } from "../security/redact.js";

// v2.4.0 / audit closure (P2.7): extract `Retry-After` from provider
// SDK error objects. Anthropic, OpenAI, Google GenAI and the OpenAI-
// compatible DeepSeek client all surface this header through `error.headers`
// (fetch-style) or `error.response.headers` (legacy axios-style). The
// retry loop already consumes `failure.retry_after_ms`, so honoring the
// server-authoritative hint is a one-place fix that helps every provider
// at once. Returns ms or undefined.
function extractRetryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidates: unknown[] = [];
  const errorObj = error as Record<string, unknown>;
  if (errorObj.headers) candidates.push(errorObj.headers);
  const response = errorObj.response;
  if (response && typeof response === "object") {
    const respHeaders = (response as Record<string, unknown>).headers;
    if (respHeaders) candidates.push(respHeaders);
  }
  for (const headers of candidates) {
    let value: string | undefined;
    if (headers && typeof (headers as { get?: unknown }).get === "function") {
      try {
        value =
          (headers as { get: (key: string) => string | null }).get("retry-after") ?? undefined;
      } catch {
        // some Headers implementations throw on missing key — ignore.
      }
    } else if (headers && typeof headers === "object") {
      const h = headers as Record<string, unknown>;
      const raw = h["retry-after"] ?? h["Retry-After"];
      if (typeof raw === "string") value = raw;
      else if (typeof raw === "number" && Number.isFinite(raw)) value = String(raw);
    }
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    // Numeric (delta-seconds).
    const seconds = Number.parseFloat(trimmed);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
    // HTTP-date.
    const date = Date.parse(trimmed);
    if (Number.isFinite(date)) {
      const delta = date - Date.now();
      if (delta > 0) return delta;
      return 0;
    }
  }
  return undefined;
}

// v2.4.0 / audit closure (P4.17): treat upstream gateway errors (502 Bad
// Gateway, 503 Service Unavailable, 504 Gateway Timeout) as retryable.
// Pre-v2.4.0 these collapsed into the generic `provider_error` class and
// the retry loop never re-tried them, even though they are textbook
// transient failures. Retain `provider_error` as the default class so
// upstream observability semantics don't change.
const GATEWAY_5XX_RE =
  /\b(?:5(?:0[234]|9\d))\b|\b(?:bad\s+gateway|service\s+unavailable|gateway\s+timeout)\b/i;

export function classifyProviderError(
  peer: PeerId,
  provider: string,
  model: string,
  error: unknown,
  attempts: number,
  started: number,
): PeerFailure {
  const message = safeErrorMessage(error);
  const contextual429 =
    /\b(?:http|status|statuscode|code|error)\s*[:=]?\s*["'(]?\s*429\b/i.test(message) ||
    /\b429\s+(?:too many requests|rate[-_\s]?limit|quota|retry-after)\b/i.test(message);
  const rateLimited =
    contextual429 ||
    /\b(?:too many requests|rate[-_\s]?limit(?:ed|ing)?|quota exceeded|resource_exhausted|retry-after)\b/i.test(
      message,
    );
  const auth =
    /\b(?:401|403|unauthorized|forbidden|invalid api key|missing api key|expired api key|authentication failed|authentication required)\b/i.test(
      message,
    );
  const cancelled =
    /\b(?:aborterror|operation was aborted|call cancelled|session_cancelled)\b/i.test(message);
  const moderation =
    /\b(?:invalid_prompt|prompt[_\s-]?flagged|moderation|moderated|safety policy|safety system|usage policy|responsibleaipolicyviolation|content[_\s-]?filter|blocked by policy|policy violation|could not be processed|input was rejected)\b/i.test(
      message,
    );
  const timeout = /\b(?:timeout|aborted|aborterror)\b/i.test(message);
  const network = /\b(?:econnreset|enotfound|etimedout|network|fetch failed)\b/i.test(message);
  const gateway5xx = GATEWAY_5XX_RE.test(message);

  const failureClass = auth
    ? "auth"
    : cancelled
      ? "cancelled"
      : moderation
        ? "prompt_flagged_by_moderation"
        : rateLimited
          ? "rate_limit"
          : timeout
            ? "timeout"
            : network
              ? "network"
              : "provider_error";

  return {
    peer,
    provider,
    model,
    failure_class: failureClass,
    message,
    retryable: !cancelled && !auth && (rateLimited || timeout || network || gateway5xx),
    recovery_hint: rateLimited
      ? "wait_and_retry"
      : moderation
        ? "reformulate_and_retry"
        : undefined,
    reformulation_advice: moderation
      ? "Rephrase the request in neutral technical language, compact prior peer discussion, avoid quoting flagged text, and keep the same engineering intent."
      : undefined,
    retry_after_ms: extractRetryAfterMs(error),
    attempts,
    latency_ms: Date.now() - started,
  };
}
