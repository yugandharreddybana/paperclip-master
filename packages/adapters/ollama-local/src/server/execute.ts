import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult, UsageSummary } from "@paperclipai/adapter-utils";
import {
  asBoolean,
  asNumber,
  asString,
  buildPaperclipEnv,
  joinPromptSections,
  renderTemplate,
  renderPaperclipWakePrompt,
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_LOCAL_MODEL } from "../index.js";

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function hasNonEmptyEnvValue(env: Record<string, string>, key: string): boolean {
  const raw = env[key];
  return typeof raw === "string" && raw.trim().length > 0;
}

function renderPaperclipEnvNote(env: Record<string, string>): string {
  const paperclipKeys = Object.keys(env)
    .filter((key) => key.startsWith("PAPERCLIP_"))
    .sort();
  if (paperclipKeys.length === 0) return "";
  return [
    "Paperclip runtime note:",
    `These PAPERCLIP_* variables describe this run (they are not automatically visible to Ollama): ${paperclipKeys.join(", ")}.`,
    "",
    "",
  ].join("\n");
}

function renderApiAccessNote(env: Record<string, string>): string {
  if (!hasNonEmptyEnvValue(env, "PAPERCLIP_API_URL") || !hasNonEmptyEnvValue(env, "PAPERCLIP_API_KEY")) return "";
  return [
    "Paperclip API access note:",
    "If you need to call the Paperclip API, use curl from a tool-enabled setup or another adapter; this Ollama run only sends text to the local model.",
    "",
    "",
  ].join("\n");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readUsageFromOllamaJson(data: Record<string, unknown>): UsageSummary | undefined {
  const prompt = data.prompt_eval_count;
  const completion = data.eval_count;
  const inputTokens = typeof prompt === "number" && Number.isFinite(prompt) ? Math.max(0, Math.floor(prompt)) : 0;
  const outputTokens =
    typeof completion === "number" && Number.isFinite(completion) ? Math.max(0, Math.floor(completion)) : 0;
  if (inputTokens === 0 && outputTokens === 0) return undefined;
  return { inputTokens, outputTokens };
}

async function readInstructionsPrefix(
  instructionsFilePath: string,
  onLog: AdapterExecutionContext["onLog"],
): Promise<string> {
  if (!instructionsFilePath) return "";
  const instructionsDir = `${path.dirname(instructionsFilePath)}/`;
  try {
    const instructionsContents = await fs.readFile(instructionsFilePath, "utf8");
    return (
      `${instructionsContents.trim()}\n\n` +
      `The above agent instructions were loaded from ${instructionsFilePath}. ` +
      `Resolve any relative file references from ${instructionsDir}.\n\n`
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await onLog(
      "stderr",
      `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
    );
    return "";
  }
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog, onMeta, authToken } = ctx;
  const baseUrl = normalizeBaseUrl(asString(config.baseUrl, "http://127.0.0.1:11434"));
  const model = asString(config.model, DEFAULT_OLLAMA_LOCAL_MODEL).trim() || DEFAULT_OLLAMA_LOCAL_MODEL;
  const stream = asBoolean(config.stream, false);
  const timeoutSec = Math.max(0, Math.floor(asNumber(config.timeoutSec, 120)));
  const timeoutMs = timeoutSec > 0 ? timeoutSec * 1000 : 0;
  const apiKey = asString(config.apiKey, "").trim();
  const promptTemplate = asString(config.promptTemplate, DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE);
  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();

  const env: Record<string, string> = {
    ...buildPaperclipEnv(agent),
    PAPERCLIP_RUN_ID: runId,
  };
  if (authToken && !hasNonEmptyEnvValue(env, "PAPERCLIP_API_KEY")) {
    env.PAPERCLIP_API_KEY = authToken;
  }

  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "heartbeat" as const },
    context,
  };

  const instructionsPrefix = await readInstructionsPrefix(instructionsFilePath, onLog);
  const wakePrompt = renderPaperclipWakePrompt(context.paperclipWake, { resumedSession: false });
  const renderedPrompt = renderTemplate(promptTemplate, templateData);
  const sessionHandoffNote = asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const paperclipEnvNote = renderPaperclipEnvNote(env);
  const apiAccessNote = renderApiAccessNote(env);

  const prompt = joinPromptSections([
    instructionsPrefix,
    wakePrompt,
    sessionHandoffNote,
    paperclipEnvNote,
    apiAccessNote,
    renderedPrompt,
  ]);

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const url = `${baseUrl}/api/chat`;
  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    stream,
  };

  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  if (onMeta) {
    await onMeta({
      adapterType: "ollama_local",
      command: "fetch",
      commandArgs: [url, stream ? "stream" : "json"],
      prompt,
      env,
    });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: `Ollama /api/chat HTTP ${res.status}: ${detail.slice(0, 500)}`,
        errorCode: "ollama_chat_http_error",
        model,
        provider: "ollama",
        biller: "ollama",
      };
    }

    if (!stream) {
      const raw = (await res.json()) as Record<string, unknown>;
      const message = asRecord(raw.message);
      const content = typeof message?.content === "string" ? message.content : "";
      if (content) {
        await onLog("stdout", `${content}\n`);
      }
      const usage = readUsageFromOllamaJson(raw);
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        summary: firstNonEmptyLine(content) || "Ollama response",
        model,
        provider: "ollama",
        biller: "ollama",
        billingType: "metered_api",
        ...(usage ? { usage } : {}),
      };
    }

    // Streaming: newline-delimited JSON
    if (!res.body) {
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: "Ollama streaming response missing body",
        errorCode: "ollama_stream_no_body",
        model,
        provider: "ollama",
      };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let combined = "";
    let lastUsage: UsageSummary | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
          await onLog("stderr", `[paperclip] Ollama stream parse error: ${trimmed.slice(0, 200)}\n`);
          continue;
        }
        const message = asRecord(parsed.message);
        const delta = typeof message?.content === "string" ? message.content : "";
        if (delta) {
          combined += delta;
          await onLog("stdout", delta);
        }
        if (parsed.done === true) {
          const u = readUsageFromOllamaJson(parsed);
          if (u) lastUsage = u;
        }
      }
    }

    const tail = buffer.trim();
    if (tail) {
      try {
        const parsed = JSON.parse(tail) as Record<string, unknown>;
        const message = asRecord(parsed.message);
        const delta = typeof message?.content === "string" ? message.content : "";
        if (delta) {
          combined += delta;
          await onLog("stdout", delta);
        }
        if (parsed.done === true) {
          const u = readUsageFromOllamaJson(parsed);
          if (u) lastUsage = u;
        }
      } catch {
        /* ignore trailing garbage */
      }
    }

    await onLog("stdout", "\n");

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: firstNonEmptyLine(combined) || "Ollama response",
      model,
      provider: "ollama",
      biller: "ollama",
      billingType: "metered_api",
      ...(lastUsage ? { usage: lastUsage } : {}),
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        exitCode: null,
        signal: null,
        timedOut: true,
        errorMessage: `Ollama request timed out after ${timeoutSec}s`,
        errorCode: "timeout",
        model,
        provider: "ollama",
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: message,
      errorCode: "ollama_fetch_error",
      model,
      provider: "ollama",
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
