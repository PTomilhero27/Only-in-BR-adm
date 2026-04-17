// app/modules/fair-showcase/showcase.schema.ts
import { z } from "zod";

// ──────────────────────────────────────────────
// Sub-schemas (itens de listas JSON)
// ──────────────────────────────────────────────

export const benefitItemSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
});

export type BenefitItem = z.infer<typeof benefitItemSchema>;

export const faqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export type FaqItem = z.infer<typeof faqItemSchema>;

// ──────────────────────────────────────────────
// Fair resumida (expandida dentro da resposta)
// ──────────────────────────────────────────────

export const showcaseFairSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    address: z.string().nullable().optional(),
    stallsCapacity: z.number().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  })
  .passthrough();

export type ShowcaseFair = z.infer<typeof showcaseFairSchema>;

// ──────────────────────────────────────────────
// Showcase response (admin)
// ──────────────────────────────────────────────

export const showcaseResponseSchema = z
  .object({
    id: z.string(),
    fairId: z.string(),
    fair: showcaseFairSchema,

    subtitle: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    shortDescription: z.string().nullable().optional(),

    coverImageUrl: z.string().nullable().optional(),
    galleryImageUrls: z.array(z.string()).default([]),

    benefits: z.array(benefitItemSchema).default([]),
    faq: z.array(faqItemSchema).default([]),

    whatsappNumber: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    locationLat: z.number().nullable().optional(),
    locationLng: z.number().nullable().optional(),

    isPublished: z.boolean(),

    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type Showcase = z.infer<typeof showcaseResponseSchema>;

export const listShowcasesResponseSchema = z.array(showcaseResponseSchema);

// ──────────────────────────────────────────────
// Create / Update requests
// ──────────────────────────────────────────────

export const createShowcaseRequestSchema = z.object({
  subtitle: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  coverImageUrl: z.string().optional(),
  galleryImageUrls: z.array(z.string()).optional(),
  benefits: z.array(benefitItemSchema).optional(),
  faq: z.array(faqItemSchema).optional(),
  whatsappNumber: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  isPublished: z.boolean().optional(),
});

export type CreateShowcaseRequest = z.infer<typeof createShowcaseRequestSchema>;

export const updateShowcaseRequestSchema = createShowcaseRequestSchema.partial();

export type UpdateShowcaseRequest = z.infer<typeof updateShowcaseRequestSchema>;

// ──────────────────────────────────────────────
// Upload response
// ──────────────────────────────────────────────

export const uploadImageResponseSchema = z.object({
  url: z.string(),
});

export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;
