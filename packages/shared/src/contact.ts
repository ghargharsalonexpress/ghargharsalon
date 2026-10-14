import { z } from "zod";
import { emailSchema, languageSchema, nameSchema } from "./auth";
import { isIndianMobile } from "./phone";
import { V } from "./validation";

/** Public contact form (plan W17). `website` is a honeypot: people never see or fill it. */
export const contactSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  phone: z
    .string(V.invalid)
    .trim()
    .refine((value) => value === "" || isIndianMobile(value), V.phone),
  message: z.string(V.required).trim().min(10, V.messageShort).max(2_000, V.invalid),
  website: z.string().max(200).optional(),
  /** Language of the acknowledgement email. */
  locale: languageSchema.optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

export const CONTACT_STATUSES = ["new", "replied", "closed"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface ContactMessageDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

export const contactStatusSchema = z.strictObject({ status: z.enum(CONTACT_STATUSES) });

/** POST /v1/client-errors (plan C3, C13): a crash in someone's browser, reported for the team. */
export const clientErrorSchema = z.strictObject({
  kind: z.enum(["render", "error", "rejection"]),
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).optional(),
  url: z.string().max(500),
  release: z.string().max(60).optional(),
});
export type ClientErrorInput = z.input<typeof clientErrorSchema>;
