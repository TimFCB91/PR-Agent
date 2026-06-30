import type { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getAIConfig } from "@/lib/ai/config";
import { getAIProvider } from "@/lib/ai/provider";
import type { AIMessage, AIMode } from "@/lib/ai/types";

export interface AgentContext {
  organizationId: string;
  userId?: string;
}

/**
 * Result envelope for every agent run. `usedFallback` is true when real AI was
 * requested but failed and the deterministic mock was used instead — callers
 * must surface this so users never mistake placeholder output for real AI.
 */
export interface AgentRunResult<O> {
  output: O;
  usedFallback: boolean;
  error?: string;
  mode: AIMode;
}

/** Human-readable warning to attach to generated content when AI fell back. */
export function fallbackNotice(r: {
  usedFallback: boolean;
  error?: string;
}): string {
  if (!r.usedFallback) return "";
  return `⚠️ KI nicht verfügbar – es wurde ein Platzhalter (Mock) eingesetzt. Bitte erneut versuchen. Grund: ${
    r.error ?? "unbekannt"
  }`;
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
  /** Max output tokens for the real provider (defaults to the provider's own). */
  maxTokens?: number;
}

/**
 * Close any still-open brackets in a JSON string that was cut off (e.g. when
 * the model hit its output-token limit mid-array). Keeps everything up to the
 * last completed value and appends the matching closers, so a truncated
 * response still yields all the complete elements instead of being discarded.
 */
function repairTruncatedJson(s: string): string {
  let inStr = false;
  let esc = false;
  let lastSafe = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "}" || c === "]") lastSafe = i + 1; // a value just completed
  }
  if (lastSafe === -1) throw new Error("no complete JSON value to repair");

  const head = s.slice(0, lastSafe);
  const open: string[] = [];
  inStr = false;
  esc = false;
  for (let i = 0; i < head.length; i++) {
    const c = head[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") open.push("}");
    else if (c === "[") open.push("]");
    else if (c === "}" || c === "]") open.pop();
  }
  return head + open.reverse().join("");
}

// Tolerant JSON extraction: strips ```json fences and isolates the outermost
// object before parsing, since some models wrap output in prose. If the result
// is truncated (over-length response), it is repaired to salvage what arrived.
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(slice);
  } catch (err) {
    const fromStart = start !== -1 ? cleaned.slice(start) : cleaned;
    try {
      return JSON.parse(repairTruncatedJson(fromStart));
    } catch {
      throw err; // surface the original parse error
    }
  }
}

export async function runAgent<I, O>(
  def: AgentDefinition<I, O>,
  rawInput: unknown,
  ctx: AgentContext,
): Promise<AgentRunResult<O>> {
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
        maxTokens: def.maxTokens,
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

  return {
    output,
    usedFallback: config.mode === "real" && !success,
    error: errorMessage,
    mode: config.mode,
  };
}
