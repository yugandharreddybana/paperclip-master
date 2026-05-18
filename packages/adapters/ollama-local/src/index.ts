export const type = "ollama_local";
export const label = "Ollama (local server)";

/** Default when no model is configured; user should pick an installed tag. */
export const DEFAULT_OLLAMA_LOCAL_MODEL = "llama3.2";

export const models: { id: string; label: string }[] = [];

export const agentConfigurationDoc = `# ollama_local agent configuration

Adapter: ollama_local

Use when:
- You run [Ollama](https://ollama.com) locally (or on your LAN) and want Paperclip to call it over HTTP
- You want a lightweight path without a separate coding-agent CLI

Don't use when:
- You need full coding-agent tool loops in the CLI sense (prefer claude_local, codex_local, etc.)
- Ollama is not reachable from the Paperclip server host at the configured base URL

Core fields (adapter config):
- baseUrl (string, optional): Ollama HTTP root, default http://127.0.0.1:11434
- model (string, required for sensible output): model tag as shown by \`ollama list\` / GET /api/tags
- apiKey (string, optional): sent as Authorization: Bearer when set (reverse proxies / hosted Ollama)
- stream (boolean, optional): stream tokens from POST /api/chat (default false)
- timeoutSec (number, optional): HTTP timeout in seconds (default 120)
- promptTemplate (string, optional): heartbeat / wake prompt template (same semantics as other local adapters)
- instructionsFilePath (string, optional): markdown instructions prepended into the user prompt

Notes:
- Runs call POST /api/chat on your Ollama server with a single user message containing the assembled Paperclip prompt.
- Model discovery uses GET /api/tags when available.
- Ensure the Paperclip process can reach baseUrl (firewall / Docker host networking).
`;
