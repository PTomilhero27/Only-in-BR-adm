import { z } from "zod"

/**
 * Schemas do módulo FairForms (admin).
 * Objetivo: evitar contrato implícito e falhas silenciosas no painel.
 */

export const FairStatusSchema = z.enum(["ATIVA", "FINALIZADA", "CANCELADA"])

export const FairFormItemSchema = z.object({
  id: z.string(),
  fairId: z.string(),
  fairStatus: FairStatusSchema,

  formId: z.string(),
  slug: z.string(),
  name: z.string(),
  active: z.boolean(),

  enabled: z.boolean(),
  startsAt: z.string().or(z.date()).transform((v) => (v instanceof Date ? v.toISOString() : v)),
  endsAt: z.string().or(z.date()).transform((v) => (v instanceof Date ? v.toISOString() : v)),

  updatedAt: z.string().or(z.date()).transform((v) => (v instanceof Date ? v.toISOString() : v)),
})

export const ListFairFormsResponseSchema = z.array(FairFormItemSchema)

export const UpsertFairFormPayloadSchema = z.object({
  enabled: z.boolean(),
  startsAt: z.string(), // ISO
  endsAt: z.string(),   // ISO
})
