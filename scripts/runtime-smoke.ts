import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCP_REQUEST_TIMEOUT_MS } from "../src/core/timeouts.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/src/mcp/server.js"],
  cwd: process.cwd(),
  env: {
    ...process.env,
    CROSS_REVIEW_V2_STUB: process.env.CROSS_REVIEW_V2_STUB ?? "1",
    // v2.4.0 / audit closure (P1.1): runtime smoke is a legitimate stub
    // consumer; opt in to the double-confirmation gate.
    CROSS_REVIEW_V2_STUB_CONFIRMED: process.env.CROSS_REVIEW_V2_STUB_CONFIRMED ?? "1",
    CROSS_REVIEW_V2_MAX_SESSION_COST_USD:
      process.env.CROSS_REVIEW_V2_MAX_SESSION_COST_USD ?? "1000",
    CROSS_REVIEW_V2_PREFLIGHT_MAX_ROUND_COST_USD:
      process.env.CROSS_REVIEW_V2_PREFLIGHT_MAX_ROUND_COST_USD ?? "1000",
    CROSS_REVIEW_V2_UNTIL_STOPPED_MAX_COST_USD:
      process.env.CROSS_REVIEW_V2_UNTIL_STOPPED_MAX_COST_USD ?? "1000",
    CROSS_REVIEW_OPENAI_INPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_OPENAI_INPUT_USD_PER_MILLION ?? "1000",
    CROSS_REVIEW_OPENAI_OUTPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_OPENAI_OUTPUT_USD_PER_MILLION ?? "1000",
    CROSS_REVIEW_ANTHROPIC_INPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_ANTHROPIC_INPUT_USD_PER_MILLION ?? "1000",
    CROSS_REVIEW_ANTHROPIC_OUTPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_ANTHROPIC_OUTPUT_USD_PER_MILLION ?? "1000",
    CROSS_REVIEW_GEMINI_INPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_GEMINI_INPUT_USD_PER_MILLION ?? "1000",
    CROSS_REVIEW_GEMINI_OUTPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_GEMINI_OUTPUT_USD_PER_MILLION ?? "1000",
    CROSS_REVIEW_DEEPSEEK_INPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_DEEPSEEK_INPUT_USD_PER_MILLION ?? "1000",
    CROSS_REVIEW_DEEPSEEK_OUTPUT_USD_PER_MILLION:
      process.env.CROSS_REVIEW_DEEPSEEK_OUTPUT_USD_PER_MILLION ?? "1000",
  },
});

const client = new Client({ name: "cross-review-v2-runtime-smoke", version: "0.0.0" });

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.callTool({ name, arguments: args }, undefined, {
    timeout: MCP_REQUEST_TIMEOUT_MS,
    maxTotalTimeout: MCP_REQUEST_TIMEOUT_MS,
  });
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  const text = content[0]?.type === "text" ? (content[0].text ?? "{}") : "{}";
  return JSON.parse(text);
}

async function pollUntilDone(sessionId: string): Promise<unknown> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const state = (await callTool("session_poll", {
      session_id: sessionId,
      response_format: "json",
    })) as { jobs?: Array<{ status: string }> };
    if (
      state.jobs?.some(
        (job) =>
          job.status === "completed" || job.status === "failed" || job.status === "cancelled",
      )
    ) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out polling runtime-smoke session ${sessionId}`);
}

try {
  await client.connect(transport);
  const serverInfo = await callTool("server_info", { response_format: "json" });
  const capabilities = await callTool("runtime_capabilities", { response_format: "json" });
  const roundStart = (await callTool("session_start_round", {
    task: "Runtime smoke: verify async review round.",
    review_focus: "runtime/smoke",
    draft: "Runtime smoke draft.",
    peers: ["codex"],
    response_format: "json",
  })) as { session_id: string };
  const roundState = await pollUntilDone(roundStart.session_id);
  const events = await callTool("session_events", {
    session_id: roundStart.session_id,
    response_format: "json",
  });
  const report = await callTool("session_report", {
    session_id: roundStart.session_id,
    response_format: "json",
  });
  const unanimousStart = (await callTool("session_start_unanimous", {
    task: "Runtime smoke: verify async unanimity flow.",
    review_focus: "runtime/unanimous",
    lead_peer: "codex",
    peers: ["claude"],
    max_rounds: 2,
    response_format: "json",
  })) as { session_id: string };
  const unanimousState = await pollUntilDone(unanimousStart.session_id);
  const cancelStart = (await callTool("session_start_round", {
    task: "Runtime smoke: verify cancellation tool.",
    draft: "FORCE_CANCEL_SLOW",
    peers: ["codex"],
    response_format: "json",
  })) as { session_id: string; job: { job_id: string } };
  const cancelResult = await callTool("session_cancel_job", {
    session_id: cancelStart.session_id,
    job_id: cancelStart.job.job_id,
    reason: "runtime_smoke_cancel",
    response_format: "json",
  });
  const cancelState = await pollUntilDone(cancelStart.session_id);
  const metrics = await callTool("session_metrics", { response_format: "json" });
  const recovery = await callTool("session_recover_interrupted", { response_format: "json" });
  console.log(
    JSON.stringify(
      {
        ok: true,
        serverInfo,
        capabilities,
        round_session_id: roundStart.session_id,
        roundState,
        events,
        report,
        unanimous_session_id: unanimousStart.session_id,
        unanimousState,
        cancel_session_id: cancelStart.session_id,
        cancelResult,
        cancelState,
        metrics,
        recovery,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
