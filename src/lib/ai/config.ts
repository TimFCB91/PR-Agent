import type { AIMode, ProviderName } from "@/lib/ai/types";

export interface AIConfig {
  mode: AIMode;
  provider: ProviderName;
  model: string;
  // Resolved at call time only when mode === "real".
  apiKey?: string;
  baseUrl?: string;
}

// Sensible per-provider default models.
const DEFAULT_MODELS: Record<ProviderName, string> = {
  mock: "mock-1",
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o",
  local: "local-model",
};

/**
 * Reads the AI configuration from environment variables. The whole system is
 * mock-by-default: without AI_MODE=real (and a key) it never calls an external
 * provider. This is the single switch between Mock Mode and Real AI Mode.
 *
 *   AI_MODE      = mock | real        (default: mock)
 *   AI_PROVIDER  = anthropic | openai | local   (default: anthropic)
 *   AI_MODEL     = override model id  (optional)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY / AI_LOCAL_BASE_URL
 */
export function getAIConfig(): AIConfig {
  const mode: AIMode = process.env.AI_MODE === "real" ? "real" : "mock";

  if (mode === "mock") {
    return { mode, provider: "mock", model: DEFAULT_MODELS.mock };
  }

  const provider = (process.env.AI_PROVIDER as ProviderName) || "anthropic";
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider] || "unknown";

  const apiKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.AI_LOCAL_API_KEY;

  const baseUrl =
    provider === "local" ? process.env.AI_LOCAL_BASE_URL : undefined;

  return { mode, provider, model, apiKey, baseUrl };
}
