// Per-text-type editorial style profiles: tone, required elements and the
// stylistic limits each text type is held to.

export type TextType =
  | "PITCH"
  | "FOLLOW_UP"
  | "BRIEFING"
  | "ARTICLE"
  | "PRESS_RELEASE"
  | "LINKEDIN"
  | "OTHER";

export interface StyleProfile {
  textType: TextType;
  label: string;
  tone: string;
  /** Soft cap on average sentence length (words). */
  maxAvgSentenceLength: number;
  /** Required content elements (human-readable, checked heuristically). */
  requiredElements: string[];
  allowAnglicisms: boolean;
  allowFirstPerson: boolean;
}

export const STYLE_PROFILES: Record<TextType, StyleProfile> = {
  PITCH: {
    textType: "PITCH",
    label: "Redaktioneller PR-Pitch",
    tone: "redaktionell, freundlich, nicht werblich",
    maxAvgSentenceLength: 20,
    requiredElements: [
      "persönliche Ansprache",
      "klarer Themenvorschlag",
      "Medienpassung",
      "redaktioneller Nutzen",
      "Expertenkontext",
      "freundlicher Abschluss",
    ],
    allowAnglicisms: false,
    allowFirstPerson: true,
  },
  FOLLOW_UP: {
    textType: "FOLLOW_UP",
    label: "Sachlicher Follow-up",
    tone: "kurz, sachlich, nicht drängend",
    maxAvgSentenceLength: 18,
    requiredElements: ["Themenbezug", "freundlicher Abschluss"],
    allowAnglicisms: false,
    allowFirstPerson: true,
  },
  BRIEFING: {
    textType: "BRIEFING",
    label: "Briefing",
    tone: "strukturiert, sachlich",
    maxAvgSentenceLength: 22,
    requiredElements: [
      "Zielgruppe",
      "Angle",
      "zentrale Aussagen",
      "Struktur",
      "No-Gos",
    ],
    allowAnglicisms: false,
    allowFirstPerson: false,
  },
  ARTICLE: {
    textType: "ARTICLE",
    label: "Expertenartikel",
    tone: "redaktionell, einordnend, nicht werblich",
    maxAvgSentenceLength: 22,
    requiredElements: [
      "eigenständiger Einstieg",
      "These oder Problemstellung",
      "Argumentation",
      "Beispiele",
    ],
    allowAnglicisms: false,
    allowFirstPerson: false,
  },
  PRESS_RELEASE: {
    textType: "PRESS_RELEASE",
    label: "Pressemitteilung",
    tone: "nachrichtlich, sachlich",
    maxAvgSentenceLength: 22,
    requiredElements: ["Kernbotschaft", "Zitat", "Belege"],
    allowAnglicisms: false,
    allowFirstPerson: false,
  },
  LINKEDIN: {
    textType: "LINKEDIN",
    label: "LinkedIn-Beitrag",
    tone: "persönlich, fachlich",
    maxAvgSentenceLength: 18,
    requiredElements: ["klarer Aufhänger", "Mehrwert"],
    allowAnglicisms: true,
    allowFirstPerson: true,
  },
  OTHER: {
    textType: "OTHER",
    label: "Sonstiger Text",
    tone: "sachlich",
    maxAvgSentenceLength: 22,
    requiredElements: [],
    allowAnglicisms: true,
    allowFirstPerson: true,
  },
};

export function getStyleProfile(textType: string | null | undefined): StyleProfile {
  const key = (textType ?? "OTHER").toUpperCase() as TextType;
  return STYLE_PROFILES[key] ?? STYLE_PROFILES.OTHER;
}
