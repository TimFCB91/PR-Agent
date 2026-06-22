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
});

// Outreach -------------------------------------------------------------------

export const outreachSchema = z.object({
  subject: z.string().trim().min(1, "Betreff erforderlich."),
  message: optionalString,
  status: z.enum(["PLANNED", "SENT", "REPLIED", "DECLINED"]),
  campaignId: z.string().trim().min(1, "Kampagne erforderlich."),
  mediaContactId: z.string().trim().min(1, "Medienkontakt erforderlich."),
  sentAt: optionalDate,
});

export type ClientInput = z.infer<typeof clientSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type MediaContactInput = z.infer<typeof mediaContactSchema>;
export type OutreachInput = z.infer<typeof outreachSchema>;
