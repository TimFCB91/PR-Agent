import type { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getAIConfig } from "@/lib/ai/config";
import { getAIProvider } from "@/lib/ai/provider";
import type { AIMessage } from "@/lib/ai/types";

export interface AgentContext {
  organizationId: string;
  userId?: string;
}

/**
 * Every agent is defined declaratively: typed input/output (Zod), a central
 * prompt builder, and a deterministic mock implementation. The runner handles
 * mode switching (mock vs real), JSON parsing, output validation, fallback, and
 * usage logging — so individual agents contain no provider or logging code.
 */
export interface AgentDefinition<I, O> {
  name: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  buildMessages: (input: I) => AIMessage[];
  mock: (input: I) => O;
}

// Tolerant JSON extraction: strips ```json fences and isolates the outermost
// object before parsing, since some models wrap output in prose.
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

export async function runAgent<I, O>(
  def: AgentDefinition<I, O>,
  rawInput: unknown,
  ctx: AgentContext,
): Promise<O> {
  const input = def.inputSchema.parse(rawInput);
  const config = getAIConfig();
  const startedAt = Date.now();

  let output: O;
  let success = true;
  let errorMessage: string | undefined;
  let model = config.model;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    if (config.mode === "mock") {
      output = def.outputSchema.parse(def.mock(input));
    } else {
      const provider = getAIProvider(config);
      const completion = await provider.complete({
        messages: def.buildMessages(input),
        json: true,
      });
      model = completion.model;
      inputTokens = completion.inputTokens;
      outputTokens = completion.outputTokens;
      output = def.outputSchema.parse(extractJson(completion.text));
    }
  } catch (err) {
    // Never let an AI failure break the workflow: fall back to the mock.
    success = false;
    errorMessage = err instanceof Error ? err.message : String(err);
    output = def.outputSchema.parse(def.mock(input));
  }

  // Persist the usage record (tenant-scoped). Logging must not break the call.
  try {
    await prisma.aIUsageLog.create({
      data: {
        agent: def.name,
        provider: config.provider,
        mode: config.mode,
        model,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startedAt,
        success,
        error: errorMessage,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
      },
    });
  } catch {
    // ignore logging failures
  }

  return output;
}
