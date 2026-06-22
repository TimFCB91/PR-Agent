import OpenAI from "openai";

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResult,
  ProviderName,
} from "@/lib/ai/types";

/**
 * OpenAI provider — also used for local OpenAI-compatible endpoints (Ollama,
 * vLLM, LM Studio, …) by passing a custom baseUrl.
 */
export class OpenAIProvider implements AIProvider {
  readonly name: ProviderName;
  readonly model: string;
  private client: OpenAI;

  constructor(opts: {
    apiKey: string;
    model: string;
    baseUrl?: string;
    name?: ProviderName;
  }) {
    this.name = opts.name ?? "openai";
    this.model = opts.model;
    this.client = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: opts.baseUrl,
    });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      response_format: request.json ? { type: "json_object" } : undefined,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      model: response.model,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    };
  }
}
