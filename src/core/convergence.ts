import type { ConvergenceResult, PeerFailure, PeerId, PeerResult, ReviewStatus } from "./types.js";

export function checkConvergence(
  expectedPeers: PeerId[],
  callerStatus: ReviewStatus,
  peers: PeerResult[],
  rejected: PeerFailure[],
): ConvergenceResult {
  const ready = peers.filter((p) => p.status === "READY").map((p) => p.peer);
  const notReady = peers.filter((p) => p.status === "NOT_READY").map((p) => p.peer);
  // v2.4.0 / audit closure (P3.15): strict equality. Pre-v2.4.0 used
  // `p.status == null` (loose), which would also accept the empty string
  // and the literal `0` if a future code path produced them. ReviewStatus
  // only accepts the three sentinel strings or undefined/null in practice,
  // so anchoring to those values eliminates a class of edge-case false
  // positives.
  const needsEvidence = peers
    .filter((p) => p.status === "NEEDS_EVIDENCE" || p.status === null || p.status === undefined)
    .map((p) => p.peer);
  const rejectedPeers = rejected.map((f) => f.peer);
  const responded = new Set(peers.map((p) => p.peer));
  const missing = expectedPeers.filter((p) => !responded.has(p) && !rejectedPeers.includes(p));
  const decisionQuality = Object.fromEntries(
    peers.map((peer) => [peer.peer, peer.decision_quality]),
  ) as ConvergenceResult["decision_quality"];
  const blockingDetails = [
    ...notReady.map((peer) => `${peer}: NOT_READY`),
    ...needsEvidence.map((peer) => `${peer}: NEEDS_EVIDENCE`),
    ...rejected.map((failure) => `${failure.peer}: ${failure.failure_class}`),
    ...missing.map((peer) => `${peer}: missing response`),
  ];

  if (callerStatus !== "READY") {
    return {
      converged: false,
      reason: `caller_status=${callerStatus}; caller must be READY`,
      ready_peers: ready,
      not_ready_peers: notReady,
      needs_evidence_peers: needsEvidence,
      rejected_peers: [...rejectedPeers, ...missing],
      decision_quality: decisionQuality,
      blocking_details: [`caller_status=${callerStatus}`, ...blockingDetails],
    };
  }
  if (rejectedPeers.length || missing.length) {
    // v2.5.0 fix (Codex audit, 2026-05-03): replace the generic
    // "one or more peers failed or did not respond" reason — observed 47
    // times in the 253-session corpus, every occurrence equally
    // unhelpful — with a structured per-peer summary. The reason field
    // remains a single string so downstream report consumers don't need
    // a schema migration; the granularity comes from listing peer +
    // failure_class (or `missing`) for every contributor.
    const detail = [
      ...rejected.map((failure) => `${failure.peer}:${failure.failure_class}`),
      ...missing.map((peer) => `${peer}:missing`),
    ].join(", ");
    return {
      converged: false,
      reason: `peers failed or did not respond: ${detail}`,
      ready_peers: ready,
      not_ready_peers: notReady,
      needs_evidence_peers: needsEvidence,
      rejected_peers: [...rejectedPeers, ...missing],
      decision_quality: decisionQuality,
      blocking_details: blockingDetails,
    };
  }
  if (notReady.length || needsEvidence.length) {
    return {
      converged: false,
      reason: "at least one peer did not declare READY",
      ready_peers: ready,
      not_ready_peers: notReady,
      needs_evidence_peers: needsEvidence,
      rejected_peers: [],
      decision_quality: decisionQuality,
      blocking_details: blockingDetails,
    };
  }
  if (ready.length !== expectedPeers.length) {
    return {
      converged: false,
      reason: "not all expected peers responded READY",
      ready_peers: ready,
      not_ready_peers: notReady,
      needs_evidence_peers: needsEvidence,
      rejected_peers: missing,
      decision_quality: decisionQuality,
      blocking_details: blockingDetails,
    };
  }
  return {
    converged: true,
    reason: "caller and all peers declared READY with no rejected peers",
    ready_peers: ready,
    not_ready_peers: [],
    needs_evidence_peers: [],
    rejected_peers: [],
    decision_quality: decisionQuality,
    blocking_details: [],
  };
}
