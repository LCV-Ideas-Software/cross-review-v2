const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /AIza[A-Za-z0-9_-]{20,}/g,
  /cfut_[A-Za-z0-9_-]{30,}/g,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /npm_[A-Za-z0-9]{30,}/g,
  /re_[A-Za-z0-9_]{30,}/g,
  /xox[baprs]-[A-Za-z0-9-]{20,}/g,
  /AKIA[A-Z0-9]{16}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/gi,
  /[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
];

const PRIVATE_KEY_LABELS = [
  "PRIVATE KEY",
  "OPENSSH PRIVATE KEY",
  "EC PRIVATE KEY",
  "RSA PRIVATE KEY",
  "DSA PRIVATE KEY",
];

const PRIVATE_KEY_BEGIN_MARKERS = PRIVATE_KEY_LABELS.map((label) => `-----BEGIN ${label}-----`);
const PRIVATE_KEY_END_MARKERS = PRIVATE_KEY_LABELS.map((label) => `-----END ${label}-----`);

function findNextMarker(
  value: string,
  markers: readonly string[],
  fromIndex: number,
): { index: number; marker: string } | undefined {
  let found: { index: number; marker: string } | undefined;
  for (const marker of markers) {
    const index = value.indexOf(marker, fromIndex);
    if (index !== -1 && (!found || index < found.index)) {
      found = { index, marker };
    }
  }
  return found;
}

function findNextPrivateKeyMarker(
  value: string,
  fromIndex: number,
): { index: number; marker: string; side: "BEGIN" | "END" } | undefined {
  const begin = findNextMarker(value, PRIVATE_KEY_BEGIN_MARKERS, fromIndex);
  const end = findNextMarker(value, PRIVATE_KEY_END_MARKERS, fromIndex);
  if (!begin) return end ? { ...end, side: "END" } : undefined;
  if (!end) return { ...begin, side: "BEGIN" };
  return begin.index <= end.index ? { ...begin, side: "BEGIN" } : { ...end, side: "END" };
}

function redactPrivateKeyBlocks(value: string): string {
  let cursor = 0;
  let parts: string[] | undefined;

  while (cursor < value.length) {
    const begin = findNextMarker(value, PRIVATE_KEY_BEGIN_MARKERS, cursor);
    if (!begin) break;

    let depth = 1;
    let scan = begin.index + begin.marker.length;
    let close: { index: number; marker: string } | undefined;

    while (scan < value.length) {
      const marker = findNextPrivateKeyMarker(value, scan);
      if (!marker) break;

      scan = marker.index + marker.marker.length;
      if (marker.side === "BEGIN") {
        depth += 1;
        continue;
      }

      depth -= 1;
      if (depth === 0) {
        close = marker;
        break;
      }
    }

    if (!close) {
      break;
    }

    parts ??= [];
    parts.push(value.slice(cursor, begin.index), "[REDACTED]");
    cursor = close.index + close.marker.length;
  }

  if (!parts) return value;
  parts.push(value.slice(cursor));
  return parts.join("");
}

export function redact(value: string): string {
  let output = redactPrivateKeyBlocks(value);
  for (const re of SECRET_PATTERNS) output = output.replace(re, "[REDACTED]");
  return output;
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return redact(error.message);
  return redact(String(error));
}
