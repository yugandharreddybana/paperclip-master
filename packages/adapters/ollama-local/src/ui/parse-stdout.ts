import type { TranscriptEntry } from "@paperclipai/adapter-utils";

export function parseOllamaStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trimEnd();
  if (!trimmed) return [];
  return [{ kind: "stdout", ts, text: trimmed }];
}
