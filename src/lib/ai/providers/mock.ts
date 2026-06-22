import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResult,
} from "@/lib/ai/types";

/**
 * No-op provider used in Mock Mode. Agents in mock mode produce their output
 * deterministically via their own `mock()` function and never call this, so it
 * only needs to be a safe placeholder.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock" as const;
  readonly model = "mock-1";

  async complete(_request: AICompletionRequest): Promise<AICompletionResult> {
    return { text: "{}", model: this.model, inputTokens: 0, outputTokens: 0 };
  }
}
