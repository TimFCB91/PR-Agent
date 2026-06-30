import { z } from "zod";

// Shared coercion helpers ----------------------------------------------------

// Turn empty form strings into undefined so optional fields stay optional.
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
    message: "Ungültige E-Mail-Adresse.",
  });

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : new Date(v)))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Ungültiges Datum.",
  });

// Optional foreign-key select: empty string -> undefined.
const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

// Optional integer parsed from a form string.
const optionalInt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
  .refine((v) => v === undefined || Number.isInteger(v), {
    message: "Ganze Zahl erforderlich.",
  });

const levelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

// Auth -----------------------------------------------------------------------

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2, "Mindestens 2 Zeichen."),
  name: z.string().trim().min(2, "Mindestens 2 Zeichen."),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse."),
  password: z.string().min(8, "Mindestens 8 Zeichen."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse."),
  password: z.string().min(1, "Passwort erforderlich."),
});

// Client ---------------------------------------------------------------------

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich."),
  contactEmail: optionalEmail,
  contactPhone: optionalString,
  website: optionalString,
  notes: optionalString,
  package: optionalString,
  responsiblePerson: optionalString,
  onboardingDate: optionalDate,
  placementGoal: optionalInt,
  tier: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["A", "B", "C"]).optional(),
  ),
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).default("ACTIVE"),
});

// Campaign -------------------------------------------------------------------

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich."),
  description: optionalString,
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]),
  clientId: z.string().trim().min(1, "Kunde erforderlich."),
  startDate: optionalDate,
  endDate: optionalDate,
});

// MediaContact ---------------------------------------------------------------

export const mediaContactSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname erforderlich."),
  lastName: z.string().trim().min(1, "Nachname erforderlich."),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse."),
  phone: optionalString,
  outlet: optionalString,
  beat: optionalString,
  notes: optionalString,
  priority: z.enum(["A", "B", "C"]).default("B"),
  relationship: z.enum(["NORMAL", "GOLD", "BLACKLIST"]).default("NORMAL"),
  doNotContact: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

// Outreach -------------------------------------------------------------------

export const outreachSchema = z.object({
  subject: z.string().trim().min(1, "Betreff erforderlich."),
  message: optionalString,
  status: z.enum([
    "DRAFT",
    "READY",
    "SENT",
    "FOLLOW_UP_DUE",
    "INTERESTED",
    "ACCEPTED",
    "DECLINED",
    "ARTICLE_DELIVERED",
    "PUBLISHED",
  ]),
  campaignId: z.string().trim().min(1, "Kampagne erforderlich."),
  mediaContactId: z.string().trim().min(1, "Medienkontakt erforderlich."),
  sentAt: optionalDate,
  pitchEmail: optionalString,
  followUpEmail: optionalString,
  lastContactDate: optionalDate,
  nextFollowUpDate: optionalDate,
  agreedTopic: optionalString,
  publicationUrl: optionalString,
  internalNotes: optionalString,
  nextStep: optionalString,
  channel: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["ZIMPEL", "GMAIL", "OUTLOOK", "PHONE", "OTHER"]).optional(),
  ),
  waitingOn: z.enum(["NONE", "AGENCY", "CLIENT", "MEDIA"]).default("NONE"),
  threadUrl: optionalString,
  // Media intelligence — captured response signals.
  responseReceivedAt: optionalDate,
  responseType: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z
      .enum([
        "NO_RESPONSE",
        "INTERESTED",
        "ACCEPTED",
        "DECLINED",
        "NEEDS_MORE_INFO",
        "OUT_OF_OFFICE",
        "WRONG_CONTACT",
      ])
      .optional(),
  ),
  responseSummary: optionalString,
  rejectionReason: optionalString,
  acceptedAngle: optionalString,
  publicationCreated: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

// ClientRawInput (1) ----------------------------------------------------------

export const rawInputSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich."),
  sourceType: z.enum([
    "NOTE",
    "WEBSITE",
    "TRANSCRIPT",
    "EMAIL",
    "BRIEFING",
    "SOCIAL",
    "PRESSKIT",
    "OTHER",
  ]),
  rawText: optionalString,
  fileName: optionalString,
  status: z.enum(["NEW", "PROCESSED", "NEEDS_REVIEW", "ARCHIVED"]),
});

// ClientInsight (2) -----------------------------------------------------------

export const insightSchema = z.object({
  insightType: z.enum([
    "POSITIONING",
    "EXPERTISE",
    "TARGET_GROUP",
    "PROOF_POINT",
    "QUOTE",
    "TOPIC_FIELD",
    "NO_GO",
    "RISK",
    "MISSING_INFO",
    "MEDIA_ANGLE",
  ]),
  title: z.string().trim().min(1, "Titel erforderlich."),
  content: optionalString,
  confidence: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? 50 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0 && v <= 100, {
      message: "Wert zwischen 0 und 100.",
    }),
  status: z.enum(["DRAFT", "APPROVED", "REJECTED"]),
});

// ClientKnowledge (manual entries) -------------------------------------------

export const knowledgeSchema = z.object({
  category: z.enum([
    "POSITIONING",
    "EXPERTISE",
    "TARGET_GROUP",
    "PROOF_POINT",
    "QUOTE",
    "REFERENCE",
    "TOPIC_FIELD",
    "MEDIA_ANGLE",
    "NO_GO",
    "RISK",
    "FAQ",
    "COMPETITOR",
    "OTHER",
  ]),
  title: z.string().trim().min(1, "Titel erforderlich."),
  content: optionalString,
  confidence: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? 50 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0 && v <= 100, {
      message: "Wert zwischen 0 und 100.",
    }),
});

// TopicIdea (3) ---------------------------------------------------------------

export const topicSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich."),
  description: optionalString,
  mediaAngle: optionalString,
  targetMediaType: optionalString,
  searchPotential: levelEnum,
  newsValue: levelEnum,
  priority: levelEnum,
  status: z.enum(["DRAFT", "APPROVED", "PITCHED", "ARCHIVED"]),
  campaignId: optionalId,
});

// Briefing (4) ----------------------------------------------------------------

export const briefingSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich."),
  targetAudience: optionalString,
  angle: optionalString,
  keyMessages: optionalString,
  suggestedStructure: optionalString,
  expertContext: optionalString,
  noGos: optionalString,
  status: z.enum(["DRAFT", "APPROVED", "DELIVERED"]),
  campaignId: optionalId,
  topicIdeaId: optionalId,
  mediaContactId: optionalId,
});

// ArticleDraft (5) ------------------------------------------------------------

export const articleSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich."),
  subtitle: optionalString,
  articleText: optionalString,
  metaDescription: optionalString,
  targetMedium: optionalString,
  targetAudience: optionalString,
  status: z.enum([
    "DRAFT",
    "REVIEW",
    "APPROVED",
    "SENT",
    "PUBLISHED",
    "ARCHIVED",
  ]),
  qualityNotes: optionalString,
  campaignId: optionalId,
  briefingId: optionalId,
});

// Publication (6) -------------------------------------------------------------

export const publicationSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich."),
  url: optionalString,
  publicationDate: optionalDate,
  notes: optionalString,
  campaignId: optionalId,
  mediaContactId: optionalId,
});

// WritingRuleSet (10) ---------------------------------------------------------

// Newline-separated textarea -> string[].
const newlineList = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );

// HTML checkbox: present ("on") -> true, absent -> false.
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

export const writingRuleSetSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich."),
  description: optionalString,
  textType: z.enum([
    "PITCH",
    "FOLLOW_UP",
    "BRIEFING",
    "ARTICLE",
    "PRESS_RELEASE",
    "LINKEDIN",
    "OTHER",
  ]),
  targetMediumType: optionalString,
  toneOfVoice: optionalString,
  rules: optionalString,
  forbiddenPhrases: newlineList,
  requiredElements: newlineList,
  preferredStructure: optionalString,
  minWords: optionalInt,
  maxWords: optionalInt,
  allowGendering: checkbox,
  allowAnglicisms: checkbox,
  allowFirstPerson: checkbox,
  allowDirectClientMention: checkbox,
});

export type ClientInput = z.infer<typeof clientSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type MediaContactInput = z.infer<typeof mediaContactSchema>;
export type OutreachInput = z.infer<typeof outreachSchema>;
export type RawInputInput = z.infer<typeof rawInputSchema>;
export type InsightInput = z.infer<typeof insightSchema>;
export type TopicInput = z.infer<typeof topicSchema>;
export type BriefingInput = z.infer<typeof briefingSchema>;
export type ArticleInput = z.infer<typeof articleSchema>;
export type PublicationInput = z.infer<typeof publicationSchema>;
export type WritingRuleSetInput = z.infer<typeof writingRuleSetSchema>;
