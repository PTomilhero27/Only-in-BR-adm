/**
 * Contratos do módulo Fairs (espelha o Swagger).
 * Evita contratos implícitos e facilita manutenção.
 *
 * Atualização:
 * - Inclui capacidade de barracas por feira:
 *   - stallsCapacity
 *   - stallsReserved
 *   - stallsRemaining
 *
 * Observação de compatibilidade:
 * - Algumas versões do backend retornam "createdByName" (string) em vez de "createdBy: { name }".
 * - Este schema aceita ambos para evitar quebra durante a transição.
 */

import { z } from 'zod'

export const fairStatusSchema = z.enum(['ATIVA', 'FINALIZADA', 'CANCELADA'])

/**
 * Payload de ocorrência usado apenas no CREATE por enquanto.
 * (No UPDATE ainda não editamos ocorrências.)
 */
export const fairOccurrenceSchema = z.object({
  startsAt: z.string().min(1, 'Informe o início.'),
  endsAt: z.string().min(1, 'Informe o fim.'),
})

export const createFairRequestSchema = z.object({
  name: z.string().min(1, 'Informe o nome.'),
  address: z.string().min(1, 'Informe o endereço.'),
  status: fairStatusSchema.optional(),
  /**
   * ✅ Capacidade máxima de barracas disponíveis nesta feira.
   * - Mantemos >= 0 (se quiser exigir >= 1, troque para .min(1))
   */
  stallsCapacity: z
    .number({ error: 'Informe a capacidade de barracas.' })
    .int('A capacidade deve ser um número inteiro.')
    .nonnegative('A capacidade não pode ser negativa.'),
  occurrences: z.array(fairOccurrenceSchema).min(1, 'Adicione ao menos uma ocorrência.'),
})

export const updateFairRequestSchema = z.object({
  name: z.string().min(1, 'Informe o nome.').optional(),
  address: z.string().min(1, 'Informe o endereço.').optional(),
  status: fairStatusSchema.optional(),
  /**
   * ✅ Permite editar a capacidade.
   * - Validação de “não reduzir abaixo do reservado” é feita no backend.
   */
  stallsCapacity: z
    .number()
    .int('A capacidade deve ser um número inteiro.')
    .nonnegative('A capacidade não pode ser negativa.')
    .optional(),
})

export const fairOccurrenceResponseSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
})

/**
 * Resumo de Formulários vinculados na feira.
 * Responsabilidade:
 * - Permitir que o admin veja/gerencie rapidamente o que está habilitado.
 * - Permitir contagem de "Formulários ativos" (enabled && active).
 *
 * Observação:
 * - startsAt/endsAt vêm em ISO (string) do backend.
 */
export const fairFormSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  active: z.boolean(), // status global do Form
  enabled: z.boolean(), // status do Form nesta feira
  startsAt: z.string(), // ISO
  endsAt: z.string(), // ISO
})

/**
 * Base comum do retorno da feira.
 * Observação:
 * - Alguns retornos antigos podem não ter capacity/reserved/remaining populados.
 *   Por isso mantemos defaults nonnegative.
 */
const fairResponseBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  status: fairStatusSchema,

  createdAt: z.string(),
  updatedAt: z.string(),

  occurrences: z.array(fairOccurrenceResponseSchema).default([]),

  /**
   * ✅ Capacidade e ocupação (contrato explícito).
   * - stallsCapacity: capacidade total da feira
   * - stallsReserved: soma de OwnerFair.stallsQty
   * - stallsRemaining: capacity - reserved (nunca negativo)
   */
  stallsCapacity: z.number().int().nonnegative().default(0),
  stallsReserved: z.number().int().nonnegative().default(0),
  stallsRemaining: z.number().int().nonnegative().default(0),

  /**
   * Contagens calculadas no backend para o painel admin.
   * - exhibitorsCount: quantidade de expositores (OwnerFair)
   * - stallsQtyTotal: soma de barracas compradas (OwnerFair.stallsQty)
   */
  exhibitorsCount: z.number().int().nonnegative().default(0),
  stallsQtyTotal: z.number().int().nonnegative().default(0),

  /**
   * Resumo dos forms vinculados nesta feira.
   */
  fairForms: z.array(fairFormSummarySchema).default([]),
})

/**
 * Compatibilidade "createdBy":
 * - Versão A: createdBy: { name }
 * - Versão B: createdByName: string | null
 *
 * O front pode escolher exibir:
 * - fair.createdBy?.name
 * - ou fair.createdByName
 */
export const fairResponseSchema = z
  .union([
    fairResponseBaseSchema.extend({
      createdBy: z.object({ name: z.string() }),
      createdByName: z.string().nullable().optional(),
    }),
    fairResponseBaseSchema.extend({
      createdByName: z.string().nullable().default(null),
      createdBy: z.object({ name: z.string() }).optional(),
    }),
  ])
  .transform((fair) => {
    /**
     * Normaliza para sempre ter os dois:
     * - createdByName (string|null)
     * - createdBy (obj opcional)
     *
     * Isso evita null-check espalhado na UI.
     */
    const createdByName =
      'createdByName' in fair && fair.createdByName != null
        ? fair.createdByName
        : 'createdBy' in fair && fair.createdBy?.name
          ? fair.createdBy.name
          : null

    return {
      ...fair,
      createdByName,
    }
  })

export const listFairsResponseSchema = z.array(fairResponseSchema)

export type CreateFairRequest = z.infer<typeof createFairRequestSchema>
export type UpdateFairRequest = z.infer<typeof updateFairRequestSchema>
export type Fair = z.infer<typeof fairResponseSchema>
export type FairFormSummary = z.infer<typeof fairFormSummarySchema>
