// Provider-agnostic AI interfaces. Agents depend ONLY on these types — never on
// a concrete provider — so OpenAI / Anthropic / local models stay swappable.

export type AIMode = "mock" | "real";
export type ProviderName = "mock" | "anthropic" | "openai" | "local";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  /** Hint that the caller expects a JSON object back. */
  json?: boolean;
  maxTokens?: number;
}

export interface AICompletionResult {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * The single seam every model integration implements. Keep it minimal: one
 * text-in / text-out completion call plus identifying metadata.
 */
export interface AIProvider {
  readonly name: ProviderName;
  readonly model: string;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
