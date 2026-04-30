# Model Selection

The server uses automatic model selection unless an explicit environment override is present.

## Rules

1. Query the provider's official model API using the current API key.
2. Keep only models that can perform text generation for the peer role.
3. Exclude known non-thinking, low-capacity or deprecated models from cross-review priority lists.
4. Compare returned model IDs against the documented priority list.
5. Select the first available model in that priority list.
6. Persist the selected model, candidate list, source URL, confidence and reason in the session snapshot.

If a provider returns models but none match the advanced thinking priority list, the runtime keeps the documented advanced fallback instead of silently downgrading to a weaker random candidate. That makes availability problems visible in probes and review rounds.

The no-downgrade behavior is covered by `scripts/smoke.ts`: when a provider
returns only a weak/deprecated candidate such as `claude-haiku-4-5`, selection
stays on the documented advanced fallback and records `confidence=unknown`.

## Current Priority Lists

OpenAI/Codex:

```text
gpt-5.5 > gpt-5.4 > gpt-5.2 > gpt-5.1-codex-max > gpt-5.1-codex > gpt-5.1 > gpt-5-pro > gpt-5
```

Anthropic/Claude:

```text
claude-opus-4-7 > claude-opus-4-6 > claude-sonnet-4-6
```

Haiku is intentionally excluded because the cross-review role requires advanced reasoning depth.

Google/Gemini:

```text
gemini-3.1-pro-preview > gemini-2.5-pro
```

`gemini-3-pro-preview` is intentionally excluded from the active fallback path because preview model deprecation is tracked through official Gemini release notes and this project avoids soon-to-deprecate intermediate previews when a newer advanced model is available.

DeepSeek:

```text
deepseek-v4-pro > deepseek-v4-flash
```

`deepseek-chat` and `deepseek-reasoner` are not active fallbacks because DeepSeek has announced their deprecation for 2026-07-24. `deepseek-v4-pro` is the preferred thinking-capable model for this project.

## Thinking Configuration

Cross-review-v2 is optimized for correctness over latency and cost. Provider adapters explicitly request thinking/reasoning where the official APIs support it:

- OpenAI/Codex: Responses API with reasoning effort `xhigh` by default.
- Anthropic/Claude: adaptive thinking with omitted thinking display plus `output_config.effort=xhigh` by default on Opus 4.7.
- Google/Gemini: `thinkingConfig.thinkingLevel=HIGH` for Gemini 3.x and automatic thinking budget for Gemini 2.5 Pro fallback.
- DeepSeek: `thinking.type=enabled` with `reasoning_effort=max` by default.

## Important

The priority list is intentionally code-level configuration, not hidden behavior. Provider model catalogs and deprecation schedules change often, so this file and `src/peers/model-selection.ts` must be reviewed against official provider documentation whenever defaults change.

The redacted real-API capability smoke for the current default models is recorded in `docs/reports/cross-review-v2-api-capability-smoke-2026-04-30.md`.
