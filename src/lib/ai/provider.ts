import { getAIConfig, type AIConfig } from "@/lib/ai/config";
import type { AIProvider } from "@/lib/ai/types";
import { MockProvider } from "@/lib/ai/providers/mock";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { OpenAIProvider } from "@/lib/ai/providers/openai";

/**
 * Central provider factory. This is the ONLY place that maps configuration to a
 * concrete provider — agents call `getAIProvider()` and stay free of any
 * vendor-specific logic.
 */
export function getAIProvider(config: AIConfig = getAIConfig()): AIProvider {
  if (config.mode === "mock" || config.provider === "mock") {
    return new MockProvider();
  }

  if (!config.apiKey && config.provider !== "local") {
    throw new Error(
      `AI_MODE=real but no API key configured for provider "${config.provider}".`,
    );
  }

  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider({
        apiKey: config.apiKey!,
        model: config.model,
      });
    case "openai":
      return new OpenAIProvider({
        apiKey: config.apiKey!,
        model: config.model,
      });
    case "local":
      return new OpenAIProvider({
        apiKey: config.apiKey ?? "local",
        model: config.model,
        baseUrl: config.baseUrl,
        name: "local",
      });
    default:
      return new MockProvider();
  }
}
