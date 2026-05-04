<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas & Software" width="520" />
</p>

# cross-review-v2

> MCP server orchestrating API-first cross-review between Claude, ChatGPT Codex, Gemini,
> and DeepSeek with unanimous convergence gates.

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![npm](https://img.shields.io/npm/v/@lcv-ideas-software/cross-review-v2.svg)](https://www.npmjs.com/package/@lcv-ideas-software/cross-review-v2)
[![runtime: API-only](https://img.shields.io/badge/runtime-API--only-blue.svg)](#what-it-does)
[![security: CodeQL Default Setup](https://img.shields.io/badge/security-CodeQL%20Default%20Setup-informational.svg)](#security)
[![license: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-green.svg)](./LICENSE)

**Install.** `npm install -g @lcv-ideas-software/cross-review-v2` (npmjs.com) or
`npm install -g @lcv-ideas-software/cross-review-v2 --registry=https://npm.pkg.github.com`
(GitHub Packages mirror)

**Status.** Stable. Current release: **v02.15.00** (npm package `2.15.0`) paired with an
API-first stable public surface. See [CHANGELOG.md](./CHANGELOG.md) for the release history.
v2.x releases [...]

The version history at a glance:

| Release         | Scope                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`v02.15.00`** | **6-item batch closing the v2.15 backlog (operator directive 2026-05-04: "Quero TODOS implementados").** New consensus-based judge autowire — `CROSS_REVIEW_V2_EVIDENCE_JUDGE_[...] |
| **`v02.14.01`** | **Hotfix: Grok default model switched to `grok-4.20-multi-agent` so `reasoning.effort` works.** Functional verification of v2.14.0 against the real xAI API surfaced a 400 (`Mod[...] |
| **`v02.14.00`** | **Bundles items 2-7 of the v2.13 backlog + path-A structural fix + Grok integration (5th peer).** v2.13.0 shipped only the lead drift fix; v2.14.0 ships the rest as a single mi[...] |
| **`v02.13.00`** | **Lead_peer meta-review drift fix (item 1 of 7 v2.13 items; items 2-7 deferred to v2.14.0 per operator scope re-framing 2026-05-04).** Closes the v2.12 ship-blocker bug where `[...] |
| **`v02.12.00`** | **Shadow auto-wire observability — turn on the data collection v2.11.0 left dark.** v2.11.0 shipped the relator-lottery safeguard and the shadow-mode auto-wire of the v2.9.0 [...] |
| **`v02.11.00`** | **Relator lottery (auto-recusal) + shadow-mode auto-wire of the v2.9.0 judge pass.** Two items bundled. (1) Relator lottery — modeled on judicial colegiados: `caller` paramet[...] |
| ~~`v02.10.00`~~ | **Drafted but not released — see v2.11.00.** v2.10.0 was rolled into v2.11.0 after operator detected the self-review failure (caller=claude was also lead_peer=claude in the t[...] |
| **`v02.09.00`** | **LLM-based satisfied detection for the Evidence Broker (operator-triggered judge pass).** Adds the explicit second signal deferred from v2.8.0: a configured judge peer reads e[...] |
| **`v02.08.00`** | **Per-provider health dashboard + Evidence Broker lifecycle (last architectural item from the Codex+Gemini audit).** `RuntimeMetrics.per_peer_health` rolls up READY rate, NEEDS[...] |
| **`v02.07.00`** | **Evidence Broker (Codex+Gemini audit item #1).** Aggregates per-peer NEEDS_EVIDENCE `caller_requests` into a deduplicated session-level checklist (stable id = `sha256(peer:ask[...] |
| **`v02.06.01`** | **Hard budget gate replication for fallback + moderation-recovery paths.** Both branches now refuse paid recoveries when `priorRoundsCost + estimate > sessionCostLimit`, mirror[...] |
| **`v02.06.00`** | **Token-delta event compaction.** Empirical measurement of 253 historical sessions surfaced 96 282 of 98 664 events (97.6%) as `peer.token.delta`. v2.6.0 coalesces deltas in th[...] |
| **`v02.05.00`** | **Evidence-and-budget hardening + Codex/Gemini audit fold-ins.** Differentiated per-field caps (summary 800, evidence 2500, requests 1500); session-start contract directives in[...] |
| **`v02.04.01`** | **CI hotfix for the v2.4.0 stub fail-fast gate.** The v2.4.0 P1.1 fail-fast threw at module-import time when CI's workflow env already had `CROSS_REVIEW_V2_STUB=1` set, because[...] |
| **`v02.04.00`** | **Audit-closure hardening pass.** Closes 18 priorities + 5 misc items from the v2.3.3 internal audit. MCP schema caps on `task`/`draft`/`initial_draft`; status parser 64 KiB by[...] |
| **`v02.03.03`** | **Review focus shielding and FinOps gates.** The front-loaded `review_focus` block is now wrapped in escaped `<review_focus>...</review_focus>` tags, and paid API calls are blo[...] |
| **`v02.03.02`** | **README/metadata release hygiene.** Reissued the README organizational standardization after Prettier formatting and active-document rename cleanup, keeping the latest release[...] |
| **`v02.03.01`** | **README organizational standardization.** Harmonized the public README opening with the shared organizational pattern, preserving the API-first operational sections while alig[...] |
| **`v02.03.00`** | **Review focus tightening.** Added provider-neutral `review_focus` across the main orchestration tools, front-loaded it in prompts, stripped accidental `/focus` prefixes, and i[...] |
| **`v02.02.00`** | **Live token streaming.** Added real provider token streaming, count-based progress events, `CROSS_REVIEW_V2_STREAM_TOKENS`, optional redacted streamed text for trusted diagnos[...] |
| **`v02.01.01`** | **Hardening and advanced-model enforcement.** Closed CodeQL issues in redaction/logging, added decision-retry recovery, standardized `CROSS_REVIEW_V2_MAX_OUTPUT_TOKENS`, remove[...] |
| **`v02.01.00`** | **First stable release as cross-review-v2.** Promoted the API-first implementation to stable, added cancellation, restart recovery, metrics, runtime capabilities, fallback even[...] |
| **`v2.0.x`**    | **Foundation hardening before stability.** The pre-stable `v02.00.xx` line built the durable session model, dashboard/reporting surface, provider adapters, retry behavior, and [...] |

## What It Does

`cross-review-v2` is the stable API-first implementation of the cross-review pattern. It does
not execute Claude CLI, Codex CLI, Gemini CLI, DeepSeek CLI, PowerShell shells, or terminal
sessions. [...]

- OpenAI client library for the Codex/OpenAI peer.
- Anthropic TypeScript client library for Claude.
- Google Gen AI client library for Gemini.
- OpenAI-compatible DeepSeek API through the OpenAI client library.

Runtime calls are real provider calls by default. Stubs exist only for smoke tests and CI when
`CROSS_REVIEW_V2_STUB=1`.

## Topology

`cross-review-v2` is MCP stdio on the outside and provider-API orchestration on the inside.
The caller host opens a durable session, the server fans out to the four peers through official
APIs, an[...]

## Peers and Transport

| Peer         | Transport                                                | Notes                                                                       |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `codex`      | OpenAI API via official client library                   | Advanced reasoning model selection with explicit reasoning effort controls. |
| `claude`     | Anthropic API via official TypeScript SDK                | Advanced Opus-class selection with adaptive thinking.                       |
| `gemini`     | Google Gen AI SDK                                        | Advanced Gemini 3.1 Pro preview selection with thinking-capable preference. |
| `deepseek`   | DeepSeek OpenAI-compatible API via OpenAI client library | Advanced `deepseek-v4-pro` selection with reasoning effort controls.        |

## Rename Notice

Starting with stable version `2.1.0`, this project is named `cross-review-v2`. The previous
development name is retained only in historical changelog and memory notes.

## Secrets

API keys are read only from Windows environment variables. This project does not save API keys
in JSON, `.env`, logs, session files, or prompts.

PowerShell examples:

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "<OPENAI_API_KEY>", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "<ANTHROPIC_API_KEY>", "User")
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "<GEMINI_API_KEY>", "User")
[Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "<DEEPSEEK_API_KEY>", "User")
```

Restart the terminal or application after changing Windows environment variables.

## Model Selection

At startup/session initialization, the server queries provider model APIs when keys are present
and selects the highest-capability model available to that key according to documented provider
prio[...]

Current documented priority defaults:

- OpenAI/Codex: `gpt-5.5` with `CROSS_REVIEW_OPENAI_REASONING_EFFORT=xhigh`.
- Anthropic/Claude: `claude-opus-4-7` with adaptive thinking and
  `CROSS_REVIEW_ANTHROPIC_REASONING_EFFORT=xhigh`.
- Google/Gemini: `gemini-3.1-pro-preview`.
- DeepSeek: `deepseek-v4-pro`.

Cross-review requires advanced thinking/reasoning-capable models. Model priority lists must not
include provider models that are known to lack thinking support, low-capacity models that are
unsui[...]

Explicit env var overrides always win:

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_OPENAI_MODEL", "gpt-5.5", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_OPENAI_REASONING_EFFORT", "xhigh", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_ANTHROPIC_MODEL", "claude-opus-4-7", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_ANTHROPIC_REASONING_EFFORT", "xhigh", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_GEMINI_MODEL", "gemini-3.1-pro-preview", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_DEEPSEEK_MODEL", "deepseek-v4-pro", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_DEEPSEEK_REASONING_EFFORT", "max", "User")
```

Optional fallback model lists are comma-separated:

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_OPENAI_FALLBACK_MODELS", "gpt-5.4,gpt-5.3", "User")
```

Each probe records the selected model, candidates returned by the API, source URL, confidence
and selection reason.

## Output Token Budget

`CROSS_REVIEW_V2_MAX_OUTPUT_TOKENS` controls the maximum output budget sent to all peer
providers. The same value is applied to OpenAI, Anthropic, Gemini and DeepSeek for review calls
and generat[...]

Default: `20000`.

Set it in the MCP host configuration when you want the limit to travel with that MCP server
entry:

```toml
[mcp_servers.cross-review-v2]
tool_timeout_sec = 1800
command = "C:/Users/leona/AppData/Roaming/npm/cross-review-v2.cmd"
args = []
env_vars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "DEEPSEEK_API_KEY"]
env = { CROSS_REVIEW_V2_MAX_OUTPUT_TOKENS = "20000" }
```

You can also set it as a Windows environment variable:

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_MAX_OUTPUT_TOKENS", "20000", "User")
```

Invalid, zero or negative values are ignored and the runtime falls back to `20000`.

`CROSS_REVIEW_V2_MAX_REVIEW_FOCUS_CHARS` controls the maximum length of the optional
`review_focus` prompt block. Default: `2000`.

## Financial Controls

Cost controls are mandatory for real provider calls. `cross-review-v2` does not hard-code
provider prices or financial fallback limits, because model pricing changes outside this
repository and e[...]

These settings have two jobs:

- **Budget ceilings** define how much one session or one round is allowed to cost before the run
  is blocked or stopped.
- **Rate cards** tell the runtime how to estimate provider cost from input/output token usage.

Without both, the server cannot honestly enforce a budget, so it refuses to spend API credits.

Required budget ceilings:

- `CROSS_REVIEW_V2_MAX_SESSION_COST_USD`: maximum estimated cost for one complete session. This
  is the main safety ceiling.
- `CROSS_REVIEW_V2_PREFLIGHT_MAX_ROUND_COST_USD`: maximum estimated cost for a single round
  before that round starts. This prevents an unexpectedly large prompt from starting an
  expensive fan-out[...]
- `CROSS_REVIEW_V2_UNTIL_STOPPED_MAX_COST_USD`: required ceiling for `until_stopped=true`
  runs. This exists because open-ended unanimity loops must still have a financial stop
  condition.

Required rate cards, in USD per million tokens:

- `CROSS_REVIEW_OPENAI_INPUT_USD_PER_MILLION`
- `CROSS_REVIEW_OPENAI_OUTPUT_USD_PER_MILLION`
- `CROSS_REVIEW_ANTHROPIC_INPUT_USD_PER_MILLION`
- `CROSS_REVIEW_ANTHROPIC_OUTPUT_USD_PER_MILLION`
- `CROSS_REVIEW_GEMINI_INPUT_USD_PER_MILLION`
- `CROSS_REVIEW_GEMINI_OUTPUT_USD_PER_MILLION`
- `CROSS_REVIEW_DEEPSEEK_INPUT_USD_PER_MILLION`
- `CROSS_REVIEW_DEEPSEEK_OUTPUT_USD_PER_MILLION`

Example with the local budget ceiling preferred by this workspace:

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_MAX_SESSION_COST_USD", "20", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_PREFLIGHT_MAX_ROUND_COST_USD", "20", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_UNTIL_STOPPED_MAX_COST_USD", "20", "User")
```

Set the eight provider rate-card variables from current official provider pricing before
running paid cross-review sessions. `server_info` reports `financial_controls.paid_calls_ready`
and the ex[...]

For example, if official pricing says a provider model costs `15.00` USD per million input
tokens and `75.00` USD per million output tokens, configure that provider with:

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_OPENAI_INPUT_USD_PER_MILLION", "15", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_OPENAI_OUTPUT_USD_PER_MILLION", "75", "User")
```

Repeat the same pattern for Anthropic, Gemini and DeepSeek using their current official
prices. Restart the MCP host after changing Windows environment variables.

You can also set the same variables directly in the MCP host configuration. This is useful when
you want a specific host entry to carry a fixed budget policy:

```toml
[mcp_servers.cross-review-v2]
tool_timeout_sec = 1800
command = "C:/Users/leona/AppData/Roaming/npm/cross-review-v2.cmd"
args = []
env_vars = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "DEEPSEEK_API_KEY",
  "CROSS_REVIEW_OPENAI_INPUT_USD_PER_MILLION",
  "CROSS_REVIEW_OPENAI_OUTPUT_USD_PER_MILLION",
  "CROSS_REVIEW_ANTHROPIC_INPUT_USD_PER_MILLION",
  "CROSS_REVIEW_ANTHROPIC_OUTPUT_USD_PER_MILLION",
  "CROSS_REVIEW_GEMINI_INPUT_USD_PER_MILLION",
  "CROSS_REVIEW_GEMINI_OUTPUT_USD_PER_MILLION",
  "CROSS_REVIEW_DEEPSEEK_INPUT_USD_PER_MILLION",
  "CROSS_REVIEW_DEEPSEEK_OUTPUT_USD_PER_MILLION",
]
env = {
  CROSS_REVIEW_V2_MAX_SESSION_COST_USD = "20",
  CROSS_REVIEW_V2_PREFLIGHT_MAX_ROUND_COST_USD = "20",
  CROSS_REVIEW_V2_UNTIL_STOPPED_MAX_COST_USD = "20"
}
```

If a run is blocked, call `server_info` and check:

- `financial_controls.paid_calls_ready`: `false` means the server is intentionally refusing
  paid calls.
- `financial_controls.missing_variables`: exact variable names that must be configured.
- `financial_controls.policy`: the reason paid calls are blocked.

## Token Streaming

Token streaming is enabled by default. Provider progress is written to the session event stream
as `peer.token.delta` events with character counts, followed by one `peer.token.completed`
event pe[...]

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_STREAM_TOKENS", "1", "User")
```

Disable token streaming only if a host cannot consume frequent session events:

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_STREAM_TOKENS", "0", "User")
```

For safety, streamed event text is not included by default. Enable it only for trusted local
diagnostics:

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_STREAM_TEXT", "1", "User")
```

When `CROSS_REVIEW_V2_STREAM_TEXT=1`, emitted text is passed through the same redaction layer
used for session artifacts before it is persisted to `events.ndjson`. Even then, streaming text
shoul[...]

`server_info` exposes the effective streaming configuration, and
`runtime_capabilities.token_streaming` reflects the active `CROSS_REVIEW_V2_STREAM_TOKENS`
setting. Streaming does not change the [...]

## Install

```powershell
npm install
npm run build
```

## Run MCP Server

```powershell
npm run build
node dist/src/mcp/server.js
```

Real peer calls can take longer than a generic MCP client's default 60-second request timeout.
Hosts and test clients should use at least 300s for MCP tool calls:

```toml
[mcp_servers.cross-review-v2]
tool_timeout_sec = 300
command = "node"
args = ["C:/Users/leona/lcv-workspace/cross-review-v2/dist/src/mcp/server.js"]
env_vars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "DEEPSEEK_API_KEY"]
env = { CROSS_REVIEW_V2_MAX_OUTPUT_TOKENS = "20000" }
```

Provider HTTP calls use `CROSS_REVIEW_V2_TIMEOUT_MS`, which defaults to 30 minutes. The 300s
setting above is for the MCP client-to-server request.

For local no-cost smoke tests only:

```powershell
$env:CROSS_REVIEW_V2_STUB="1"
npm test
```

For a real provider streaming check with the four API keys, run:

```powershell
npm run api-streaming-smoke
```

The real smoke prints model names, status, usage and token-event counts only. It does not
print prompts, provider text or API keys.

## Dashboard

```powershell
npm run dashboard
```

Then open `http://127.0.0.1:4588`.

## MCP Tools

- `server_info`
- `runtime_capabilities`
- `probe_peers`
- `session_init`
- `session_list`
- `session_read`
- `ask_peers`
- `session_start_round`
- `run_until_unanimous`
- `session_start_unanimous`
- `session_cancel_job`
- `session_recover_interrupted`
- `session_poll`
- `session_events`
- `session_metrics`
- `session_report`
- `session_check_convergence`
- `session_attach_evidence`
- `escalate_to_operator`
- `session_sweep`
- `session_finalize`

## Review Focus

Use optional `review_focus` when a broad review needs a stable scope anchor, for example
`services/billing`, `src/core/session-store.ts`, or `release automation`.

The field is available on `session_init`, `ask_peers`, `session_start_round`, `run_until_unanimous`
and `session_start_unanimous`. Session-level focus is saved as `meta.review_focus`; per-call fo[...]

The injected block also tells reviewers to label possible findings outside that focus as
`OUT OF SCOPE` instead of counting them as blocking issues, unless the issue is a critical
cross-cutting c[...]

This is intentionally not Claude Code's `/focus` slash command. Official Claude Code docs
describe `/focus` as a focus-mode UI toggle; Cross Review uses `review_focus` so the same
instruction wor[...]

## Observe the Session

Session metadata records in-flight rounds, convergence scope, convergence health, failed
attempts, operator escalations, fallback events and attached evidence files. Each session can
also produce[...]

`session_start_round` and `session_start_unanimous` return immediately with a `job_id` and
`session_id`. Use `session_poll` for state, `session_events` for incremental events,
`session_metrics` f[...]

Provider responses that report a different model from the model requested are recorded as
`silent_model_downgrade` failures and block convergence. Responses that cannot be parsed after
one automa[...]

When a provider rejects a prompt through moderation or safety filtering, the orchestrator
records `prompt_flagged_by_moderation`, retries once with a compact sanitized review prompt,
and marks su[...]

Secret redaction is applied when prompts, responses, evidence and JSON metadata are written.
The redactor covers known API-key and token formats; new credential formats should be added
before pub[...]

## Security

- Public-repo ready `.gitignore`.
- No secrets in committed files.
- GitHub Pages via Actions artifact deployment.
- Dependabot configured.
- Dependabot automerge workflow prepared.
- Pushes to `main` auto-create an organization-standard display tag such as `v02.01.00` from
  `package.json`; the tag then creates a normal GitHub Release and publishes
  `@lcv-ideas-software/cross-[...]
- CodeQL must be enabled through GitHub Default Setup after repository creation. Advanced
  Setup requires prior authorization.

## Status

Current version: `v02.11.00` (npm package `2.11.0`).

Version `v02.01.00` (npm package `2.1.0`) is the first stable release of `cross-review-v2`.

## License

**Apache License 2.0** — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

Copyright 2026 Leonardo Cardozo Vargas.

## Links

- Release history: [`CHANGELOG.md`](./CHANGELOG.md)
- Security: [`SECURITY.md`](./SECURITY.md)
- License: [`LICENSE`](./LICENSE)
