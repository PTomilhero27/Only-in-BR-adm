/**
 * Contratos do módulo Fairs (Zod).
 *
 * ✅ Inclui:
 * - stallsCapacity/stallsReserved/stallsRemaining
 * - taxes[]
 *
 * Compatibilidade:
 * - createdByName pode vir
 * - createdBy pode vir (ou não)
 * - taxes podem vir SEM fairId
 */

import { z } from "zod";

export const fairStatusSchema = z.enum(["ATIVA", "FINALIZADA", "CANCELADA"]);

/**
 * CREATE: ocorrências
 */
export const fairOccurrenceSchema = z.object({
  startsAt: z.string().min(1, "Informe o início."),
  endsAt: z.string().min(1, "Informe o fim."),
});

/**
 * RESPONSE: ocorrência
 */
export const fairOccurrenceResponseSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
});

/**
 * Forms vinculados (resumo)
 */
export const fairFormSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  active: z.boolean(),
  enabled: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
});

/**
 * ✅ Taxa (response)
 * fairId é opcional pra não quebrar dependendo do backend.
 */
export const fairTaxSchema = z.object({
  id: z.string(),
  fairId: z.string().optional(),
  name: z.string(),
  percentBps: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * ✅ Taxa (upsert input)
 * - id opcional
 * - isActive opcional (se não mandar, backend assume default/sem change)
 */
export const fairTaxUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Informe o nome da taxa."),
  percentBps: z
    .number()
    .int("O percentual deve ser um número inteiro (BPS).")
    .min(0, "O percentual não pode ser negativo.")
    .max(10000, "O percentual não pode passar de 100,00%."),
  isActive: z.boolean().optional(),
});

export const createFairRequestSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  address: z.string().min(1, "Informe o endereço."),
  status: fairStatusSchema.optional(),

  stallsCapacity: z
    .number({ error: "Informe a capacidade de barracas." })
    .int("A capacidade deve ser um número inteiro.")
    .nonnegative("A capacidade não pode ser negativa."),

  occurrences: z
    .array(fairOccurrenceSchema)
    .min(1, "Adicione ao menos uma ocorrência."),

  /**
   * ✅ taxes opcional
   * (se você quiser obrigar, mude para .min(1))
   */
  taxes: z.array(fairTaxUpsertSchema).optional(),
});

export const updateFairRequestSchema = z
  .object({
    name: z.string().min(1, "Informe o nome.").optional(),
    address: z.string().min(1, "Informe o endereço.").optional(),
    status: fairStatusSchema.optional(),

    stallsCapacity: z
      .number()
      .int("A capacidade deve ser um número inteiro.")
      .nonnegative("A capacidade não pode ser negativa.")
      .optional(),

    /**
     * ✅ upsert taxes no patch
     */
    taxes: z.array(fairTaxUpsertSchema).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Envie ao menos um campo para atualizar.",
  });

/**
 * RESPONSE: feira
 * - createdByName e createdBy são opcionais (compatibilidade)
 */
export const fairResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    status: fairStatusSchema,

    createdAt: z.string(),
    updatedAt: z.string(),

    occurrences: z.array(fairOccurrenceResponseSchema).default([]),

    stallsCapacity: z.number().int().nonnegative().default(0),
    stallsReserved: z.number().int().nonnegative().default(0),
    stallsRemaining: z.number().int().nonnegative().default(0),

    exhibitorsCount: z.number().int().nonnegative().default(0),
    stallsQtyTotal: z.number().int().nonnegative().default(0),

    fairForms: z.array(fairFormSummarySchema).default([]),

    taxes: z.array(fairTaxSchema).default([]),

    createdByName: z.string().nullable().optional(),
    createdBy: z.object({ name: z.string() }).optional(),
  })
  .transform((fair) => {
    const createdByName =
      fair.createdByName != null
        ? fair.createdByName
        : (fair.createdBy?.name ?? null);

    return { ...fair, createdByName };
  });

export const listFairsResponseSchema = z.array(fairResponseSchema);

// Types inferidos
export type CreateFairRequest = z.infer<typeof createFairRequestSchema>;
export type UpdateFairRequest = z.infer<typeof updateFairRequestSchema>;
export type Fair = z.infer<typeof fairResponseSchema>;
export type FairFormSummary = z.infer<typeof fairFormSummarySchema>;
export type FairTax = z.infer<typeof fairTaxSchema>;
export type FairTaxUpsertInput = z.infer<typeof fairTaxUpsertSchema>;
