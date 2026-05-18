import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";

export function getOllamaLocalConfigSchema(): AdapterConfigSchema {
  return {
    fields: [
      {
        key: "baseUrl",
        label: "Ollama server URL",
        type: "text",
        required: false,
        default: "http://127.0.0.1:11434",
        hint: "Base URL for the Ollama HTTP API (no trailing path). Example: http://127.0.0.1:11434 or http://host.docker.internal:11434",
      },
      {
        key: "model",
        label: "Model",
        type: "combobox",
        required: true,
        default: "llama3.2",
        hint: "Tags from your Ollama server (GET /api/tags). Type a name if yours is not listed.",
        meta: { useAdapterModels: true },
      },
      {
        key: "apiKey",
        label: "API key (optional)",
        type: "text",
        required: false,
        hint: "If set, sent as Authorization: Bearer. Use when Ollama sits behind auth.",
      },
      {
        key: "stream",
        label: "Stream response",
        type: "toggle",
        default: false,
        hint: "Stream tokens from /api/chat (shows incremental output in the run log).",
      },
      {
        key: "timeoutSec",
        label: "HTTP timeout (seconds)",
        type: "number",
        default: 120,
        hint: "Abort the request after this many seconds (0 = use fetch default).",
      },
    ],
  };
}
