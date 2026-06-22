import type { InsightType, KnowledgeCategory } from "@prisma/client";

import { processRawInput } from "@/lib/intake/intakeProcessor";

/**
 * Knowledge builder.
 *
 * Consolidates many raw client inputs into structured knowledge entries and a
 * (prepared) knowledge graph that links related concepts — e.g. a TOPIC_FIELD
 * node connected to the EXPERTISE and MEDIA_ANGLE that support it.
 *
 * MVP: deterministic MOCK built on the existing intake processor. The contract
 * (raw inputs in, knowledge + graph out) is shaped so an AI extraction model
 * can replace the body later without touching callers.
 */

export interface RawInputLike {
  id: string;
  title: string;
  rawText?: string | null;
  sourceType: string;
}

export interface ProposedKnowledge {
  category: KnowledgeCategory;
  title: string;
  content: string;
  confidence: number;
  sourceIds: string[];
}

export interface ProposedNode {
  key: string; // temporary key used to wire edges before DB ids exist
  type: string;
  label: string;
  description?: string;
}

export interface ProposedEdge {
  fromKey: string;
  toKey: string;
  relation: string;
}

export interface KnowledgeBuildResult {
  knowledge: ProposedKnowledge[];
  nodes: ProposedNode[];
  edges: ProposedEdge[];
}

const INSIGHT_TO_CATEGORY: Record<InsightType, KnowledgeCategory> = {
  POSITIONING: "POSITIONING",
  EXPERTISE: "EXPERTISE",
  TARGET_GROUP: "TARGET_GROUP",
  PROOF_POINT: "PROOF_POINT",
  QUOTE: "QUOTE",
  TOPIC_FIELD: "TOPIC_FIELD",
  NO_GO: "NO_GO",
  RISK: "RISK",
  MISSING_INFO: "OTHER",
  MEDIA_ANGLE: "MEDIA_ANGLE",
};

export function buildKnowledge(inputs: RawInputLike[]): KnowledgeBuildResult {
  const knowledge: ProposedKnowledge[] = [];

  for (const input of inputs) {
    const proposals = processRawInput({
      title: input.title,
      rawText: input.rawText,
      sourceType: input.sourceType,
    });
    for (const p of proposals) {
      knowledge.push({
        category: INSIGHT_TO_CATEGORY[p.insightType],
        title: p.title,
        content: p.content,
        confidence: p.confidence,
        sourceIds: [input.id],
      });
    }
  }

  // Build graph nodes (one per knowledge entry) and connect topic fields to the
  // expertise / media-angle entries that support them.
  const nodes: ProposedNode[] = knowledge.map((k, i) => ({
    key: `n${i}`,
    type: k.category,
    label: k.title,
    description: k.content,
  }));

  const edges: ProposedEdge[] = [];
  const topicNodes = nodes.filter((n) => n.type === "TOPIC_FIELD");
  const supportNodes = nodes.filter(
    (n) => n.type === "EXPERTISE" || n.type === "MEDIA_ANGLE" || n.type === "PROOF_POINT",
  );
  for (const topic of topicNodes) {
    for (const support of supportNodes) {
      edges.push({ fromKey: support.key, toKey: topic.key, relation: "supports" });
    }
  }

  return { knowledge, nodes, edges };
}
