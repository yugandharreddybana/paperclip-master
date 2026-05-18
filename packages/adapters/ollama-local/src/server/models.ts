import type { AdapterModel } from "@paperclipai/adapter-utils";
import { asString } from "@paperclipai/adapter-utils/server-utils";

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function tagsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/api/tags`;
}

export async function listOllamaModels(config: Record<string, unknown>): Promise<AdapterModel[]> {
  const baseUrl = normalizeBaseUrl(asString(config.baseUrl, "http://127.0.0.1:11434"));
  const apiKey = asString(config.apiKey, "").trim();
  const headers: Record<string, string> = {};
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const res = await fetch(tagsUrl(baseUrl), { method: "GET", headers });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as { models?: Array<{ name?: string; model?: string }> };
  const models = Array.isArray(data.models) ? data.models : [];
  const out: AdapterModel[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    const id = typeof m.name === "string" ? m.name.trim() : typeof m.model === "string" ? m.model.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label: id });
  }
  return out;
}
