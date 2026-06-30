import Anthropic from "@anthropic-ai/sdk";

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResult,
} from "@/lib/ai/types";

/**
 * Anthropic (Claude) provider. Uses the official @anthropic-ai/sdk.
 * Defaults to claude-opus-4-8. System messages are hoisted to the top-level
 * `system` parameter; the remaining turns map to the messages array.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private client: Anthropic;

  constructor(opts: { apiKey: string; model: string }) {
    this.model = opts.model;
    this.client = new Anthropic({ apiKey: opts.apiKey });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      system: system || undefined,
      messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
