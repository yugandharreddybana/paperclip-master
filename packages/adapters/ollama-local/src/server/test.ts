import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import { asString } from "@paperclipai/adapter-utils/server-utils";
import { listOllamaModels } from "./models.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = ctx.config ?? {};
  const baseUrl = normalizeBaseUrl(asString(config.baseUrl, "http://127.0.0.1:11434"));
  const model = asString(config.model, "").trim();
  const apiKey = asString(config.apiKey, "").trim();
  const timeoutSec = Math.max(5, Math.floor(Number(config.timeoutSec) || 120));
  const timeoutMs = timeoutSec * 1000;

  const headers: Record<string, string> = {};
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/tags`, { method: "GET", headers, signal: controller.signal });
    if (!res.ok) {
      checks.push({
        code: "ollama_tags_http",
        level: "error",
        message: `Ollama /api/tags returned HTTP ${res.status}`,
        detail: await res.text().catch(() => null),
        hint: "Is Ollama running? Try `ollama serve` or check baseUrl.",
      });
    } else {
      const models = await listOllamaModels(config);
      checks.push({
        code: "ollama_tags_ok",
        level: "info",
        message: `Reachable Ollama at ${baseUrl}`,
        detail: models.length > 0 ? `${models.length} model(s) reported` : "No models in /api/tags response",
      });

      if (model && models.length > 0) {
        const ids = new Set(models.map((m) => m.id));
        if (!ids.has(model)) {
          checks.push({
            code: "ollama_model_missing",
            level: "warn",
            message: `Configured model "${model}" not found in /api/tags`,
            hint: "Pull the model (`ollama pull ...`) or fix the model name.",
          });
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      code: "ollama_unreachable",
      level: "error",
      message: `Cannot reach Ollama at ${baseUrl}`,
      detail: message,
      hint: "Confirm Ollama is listening and baseUrl is reachable from this Paperclip host.",
    });
  } finally {
    clearTimeout(timer);
  }

  return {
    adapterType: "ollama_local",
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
