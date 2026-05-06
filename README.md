<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas & Software" width="520" />
</p>

# cross-review-v2

> MCP server orchestrating API-first cross-review between Claude, ChatGPT Codex,
> Gemini, DeepSeek, and Grok with unanimous convergence gates.

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![npm](https://img.shields.io/npm/v/@lcv-ideas-software/cross-review-v2.svg)](https://www.npmjs.com/package/@lcv-ideas-software/cross-review-v2)
[![runtime: API-only](https://img.shields.io/badge/runtime-API--only-blue.svg)](#what-it-does)
[![security: CodeQL Default Setup](https://img.shields.io/badge/security-CodeQL%20Default%20Setup-informational.svg)](#security)
[![license: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-green.svg)](./LICENSE)

**Install.**

```bash
npm install -g @lcv-ideas-software/cross-review-v2
# or using the GitHub Packages mirror:
npm install -g @lcv-ideas-software/cross-review-v2 --registry=https://npm.pkg.github.com
```

**Status.** Stable. Current release: **v02.18.01** (npm package `2.18.1`). See
[CHANGELOG.md](./CHANGELOG.md) for the release history.

The version history at a glance:

| Release | Scope |
|---|---|
| **`v02.18.00`** | **F1 caller capability tokens (coordinated with cross-review-v1 v1.11.0).** Cryptographic identity proof that complements the v2.17.0 clientInfo gate. Pre-v2.18.0 the v2.17.0 cross-check between `caller` and `clientInfo.name` only catches *inconsistent* self-reports — both fields are declared by the caller. F1 introduces a per-host secret (env `CROSS_REVIEW_CALLER_TOKEN`), authoritative on match and rejected on mismatch. New `caller-tokens` module exposes generation, loading, constant-time hex matching, env verification and a best-effort parent-process snapshot for forensics (Option C / Hybrid). New MCP tool `regenerate_caller_tokens` rotates `host-tokens.json`. New env vars `CROSS_REVIEW_CALLER_TOKEN`, `CROSS_REVIEW_TOKENS_FILE`, `CROSS_REVIEW_REQUIRE_TOKEN`. New `caller_tokens` block in `server_info` surfaces the gate state. `verifyCallerIdentity` extended with `verification_method` ("token" | "client_info" | "none") and `identity_metadata`. R2 codex catch hardening: `caller="operator"` from a host carrying a token throws `identity_forgery_blocked` (closes the operator-bypass window). Permissive default — hosts without tokens fall back to v2.17.0 clientInfo gate; operator opts into hard-enforce mode after distributing secrets. Smoke marker `caller_capability_tokens_test` covers 16 cases including the new overlay paths and the R2 hardening. **Minor bump** (additive public surface). |
| **`v02.17.00`** | **HARD GATE — identity forgery rejection (operator directive 2026-05-05).** Empirical evidence flagrada: cross-review-v2 session `0994cbaf` foi criada por Codex com `caller=claude` (impersonação para auto-exclusão do real Claude da panel). Pre-v2.17.0 v2 nem capturava `clientInfo` da MCP initialize handshake — `caller` era trusted unconditionally. v2.17.0 adiciona `verifyCallerIdentity(declaredCaller, clientInfo)` que cross-checks o caller declarado contra `getCallerCandidatesFromClientInfo(clientInfo)`. Aplicado em todos os 6 handlers caller-accepting: `session_init`, `ask_peers`, `session_start_round`, `run_until_unanimous`, `session_start_unanimous`, `contest_verdict` (quando `new_caller` provided). Match → OK + `identity_verified=true`. clientInfo unknown → OK + `identity_verified=false` (legitimate override). `caller="operator"` → OK (no agent claim made). Mismatch OR multi-match clientInfo → throws `identity_forgery_blocked`. Smoke `identity_forgery_blocked_test` (6 sub-tests). Coordinated ship com `cross-review-v1 v1.9.0`. **Minor bump** porque public surface adds `identity_forgery_blocked` error. Cross-review trilateral bypassed por operator directive (security fix to the gate itself, would otherwise route through compromised gate). |
| **`v02.16.00`** | **Tribunal protocol repair plus operational doctor.** Separates petitioner/caller from relator metadata, applies self-recusal to direct `ask_peers`, adds read-only `session_doctor`, fixes Windows smoke teardown, and refreshes provider model guidance from official docs. |
| **`v02.15.01`** | **`server_info` consensus visibility hotfix.** Exposes `consensus_peers` and `configured_consensus_peers_raw` for evidence-judge autowire so operators can audit the same configuration the dispatcher is using. |
| **`v02.15.00`** | **Backlog bundle for operational judge controls.** Added consensus-based judge autowire, per-call reasoning-effort overrides, opt-in real-API smoke, provider 4xx docs hints, and a Grok reasoning-capability allowlist while exposing consensus toggles across the six MCP host configs. |
| **`v02.14.01`** | **Grok reasoning model hotfix.** Switched the default Grok model to `grok-4.20-multi-agent` after real xAI verification and official docs showed `reasoning.effort` is accepted only on that model family. |
| **`v02.14.00`** | **Grok joins the tribunal.** Expanded the peer set to five with Grok, added per-peer on/off env vars, precision-report groundwork, active evidence-judge autowire, `contest_verdict`, multi-peer judge consensus, attached-evidence prompt injection, and CodeQL-safe temp-directory handling. |
| **`v02.13.00`** | **Lead meta-review drift fix.** Added explicit `ship` versus `review` session mode, lead drift detection, drift telemetry, and an abort gate so `run_until_unanimous` does not replace the artifact under review with a structured peer-review verdict. |
| **`v02.12.00`** | **Shadow judge observability.** Turned on evidence-judge shadow-mode data collection, surfaced autowire config in `server_info`, added dashboard/runtime rollups, and codified the tribunal-colegiado model for caller, relator, peer votes, and contestation. |
| **`v02.11.00`** | **Relator lottery plus shadow auto-wire.** Added automatic relator selection that excludes the caller and wired the v2.9 judge pass in shadow mode so self-review drift stops at the session structure. |
| **`v02.09.00`** | **LLM evidence-judge pass.** Added an operator-triggered judge that evaluates open evidence asks against the current draft and promotes only verified satisfied items, leaving inferred/unknown cases open. |
| **`v02.08.00`** | **Per-peer health and Evidence Broker lifecycle.** Added health rollups, evidence lifecycle tracking, resurfacing inference, dashboard surfaces, and the final architectural audit item on top of v2.7. |
| **`v02.07.00`** | **Evidence Broker.** Added a persistent per-session evidence checklist that deduplicates `NEEDS_EVIDENCE` caller requests and injects outstanding asks into subsequent revision prompts. |
| **`v02.06.01`** | **Fallback/recovery budget hard gate.** Replicated hard budget refusal to fallback and moderation-recovery paths so paid recovery calls cannot silently exceed the session cost ceiling. |
| **`v02.06.00`** | **Token-delta compaction plus v2.5 format hotfix bundle.** Coalesced streaming token delta events to reduce `events.ndjson` noise and bundled the deferred Prettier/format fix from v2.5. |
| **`v02.05.00`** | **Evidence and budget hardening pass.** Folded in operator-requested evidence/budget improvements plus empirical Codex/Gemini audit findings from historical session analysis. |
| **`v02.04.01`** | **CI stub fail-fast hotfix.** Fixed import-time server startup so the smoke harness can import MCP schemas while `CROSS_REVIEW_V2_STUB=1` is set in CI with explicit confirmation. |
| **`v02.04.00`** | **Audit-closure hardening pass.** Closed internal v2.3.3 technical-opinion priorities with additive public-surface hardening and several explicitly documented behavior changes. |
| **`v02.03.03`** | **Prompt shielding and financial safety.** Wrapped `review_focus` in escaped delimiters, blocked paid calls until financial controls are configured, expanded `server_info` financial diagnostics, and hardened MCP IDs, sweeps, jobs, and recovery cost alerts. |
| **`v02.03.02`** | **CI-green README/docs cleanup.** Reissued README organizational standardization under the repository Prettier policy and completed active-document rename cleanup in `NOTICE` and `CODE_OF_CONDUCT.md`. |
| **`v02.03.01`** | **README organizational standardization.** Adopted the shared LCV README opening while preserving the API-first runtime, model-selection, streaming, and observability sections. |
| **`v02.03.00`** | **Provider-neutral `review_focus`.** Added focus support across session tools, persisted focus metadata, injected bounded focus blocks into generation/review/retry prompts, and aligned auto-tag/publish automation with the stable package line. |
| **`v02.02.00`** | **Provider token streaming.** Added real token streaming for OpenAI, Anthropic, Gemini, and DeepSeek, with count-based progress events, runtime controls, and text-redaction defaults for persisted event logs. |
| **`v02.01.01`** | **CodeQL and model-selection hardening.** Fixed secret-redaction ReDoS and dashboard log-injection alerts, added decision retry for empty peer output, max-output-token controls, stronger model selection, and improved thinking controls. |
| **`v02.01.00`** | **First stable `cross-review-v2` release.** Promoted the API-first implementation to stable with cancellation, restart recovery, metrics, runtime capabilities, prompt compaction, budget preflight, model fallback, and stable naming. |
| **`v02.00.04`** | **Session event race hotfix.** Removed the CodeQL file-system race in `events.ndjson` persistence by appending under the session lock. |
| **`v02.00.03`** | **Background sessions and durable reports.** Added background MCP tools, durable events and reports, peer decision-quality tracking, generation accounting, provider cost rates, budget guard, moderation-safe retry, and dashboard event/report APIs. |
| **`v02.00.02`** | **Publishing and dashboard sanitization.** Normalized npm dist-tags, replaced the sponsor landing with the SumUp support page, sanitized dashboard 500 responses, and bumped the alpha runtime. |
| **`v02.00.01`** | **Public npm/package metadata alignment.** Enforced public npm visibility, added registry visibility checks, aligned funding metadata, normalized `repository.url`, and bumped the alpha runtime. |
| **`v02.00.00`** | **Development package line hardening.** Added parser format recovery, convergence metadata, shared MCP timeout/runtime smoke, auto-tag/release publishing, padded public tags, prepack clean builds, ignore-rule hardening, and quorum preservation. |
| **`v2.0.0-alpha.2`** | **Durable session recovery alpha.** Added in-flight metadata, convergence health, evidence attachment, operator escalation, session sweep, convergence inspection, silent-model-downgrade failures, and smoke coverage for the new surfaces. |
| **`v2.0.0-alpha.1`** | **Model attestation and store hardening alpha.** Added reported-model tracking, failed-attempt aggregation, recovery hints, atomic/locked session writes, UUID path hardening, safer probes, self-review prevention, English peer prompts, and expanded redaction. |
| **`v2.0.0-alpha.0`** | **Initial API/SDK-only MCP server.** Introduced official SDK adapters for OpenAI, Anthropic, Gemini, and DeepSeek, runtime model discovery, best-model selection, and a durable local session store. |

## What It Does

`cross-review-v2` is the stable API-first implementation of the cross-review
pattern. It orchestrates provider API clients (OpenAI/Codex, Anthropic/Claude,
Google Gemini, DeepSeek, and xAI/Grok) and provides an MCP-compatible server
surface.

Runtime calls are real provider calls by default. Stubs exist only for smoke
tests and CI when `CROSS_REVIEW_V2_STUB=1`.

- OpenAI client library for the Codex/OpenAI peer.
- Anthropic TypeScript client library for Claude.
- Google Gen AI client library for Gemini.
- OpenAI-compatible DeepSeek API through the OpenAI client library.
- OpenAI-compatible xAI Grok API through the OpenAI client library.

## Quick Start

```powershell
# Set API keys (PowerShell example)
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "<OPENAI_API_KEY>", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "<ANTHROPIC_API_KEY>", "User")
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "<GEMINI_API_KEY>", "User")
[Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "<DEEPSEEK_API_KEY>", "User")
[Environment]::SetEnvironmentVariable("GROK_API_KEY", "<GROK_API_KEY>", "User")
```

Restart your terminal after changing environment variables.

Build and run locally:

```bash
npm install
npm run build
node dist/src/mcp/server.js
```

For local smoke tests (no-cost):

```powershell
$env:CROSS_REVIEW_V2_STUB = "1"
npm test
```

## Configuration

Model selection and runtime behaviour can be controlled with environment
variables. Example overrides (PowerShell):

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_OPENAI_MODEL", "gpt-5.5", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_OPENAI_REASONING_EFFORT", "xhigh", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_GROK_MODEL", "grok-4.20-multi-agent", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_GROK_REASONING_EFFORT", "xhigh", "User")
```

For Grok, `GROK_API_KEY` is canonical. `grok-4-latest`, `grok-4.3`,
`grok-4.20`, and `grok-4.20-reasoning` use xAI automatic reasoning without an explicit
`reasoning.effort` field. `grok-4.20-multi-agent` accepts explicit
`reasoning.effort`; `low`/`medium` select 4 agents and `high`/`xhigh` select
16 agents.

Financial and budget controls are required for paid provider calls. Configure
these environment variables before running real sessions (example):

```powershell
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_MAX_SESSION_COST_USD", "20", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_PREFLIGHT_MAX_ROUND_COST_USD", "20", "User")
[Environment]::SetEnvironmentVariable("CROSS_REVIEW_V2_UNTIL_STOPPED_MAX_COST_USD", "20", "User")
```

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
- `session_doctor`
- `session_report`
- `session_check_convergence`
- `session_attach_evidence`
- `escalate_to_operator`
- `session_sweep`
- `session_finalize`

## License

Apache License 2.0 — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

Copyright 2026 Leonardo Cardozo Vargas.

---

<p align="center"><span style="font-size: 1.5em;"><strong>© LCV Ideas &amp; Software</strong></span><br><sub>LEONARDO CARDOZO VARGAS TECNOLOGIA DA INFORMACAO LTDA<br>Rua Pais Leme, 215 Conj 1713&nbsp;&nbsp;- Pinheiros<br>São Paulo - SP<br>CEP 05.424-150<br>CNPJ: 66.584.678/0001-77<br>IM 05.424-150</sub></p>
