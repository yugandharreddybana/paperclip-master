import type { UIAdapterModule } from "../types";
import { parseOllamaStdoutLine } from "@paperclipai/adapter-ollama-local/ui";
import { SchemaConfigFields, buildSchemaAdapterConfig } from "../schema-config-fields";

export const ollamaLocalUIAdapter: UIAdapterModule = {
  type: "ollama_local",
  label: "Ollama (local server)",
  parseStdoutLine: parseOllamaStdoutLine,
  ConfigFields: SchemaConfigFields,
  buildAdapterConfig: buildSchemaAdapterConfig,
};
