/**
 * Contratos > Contracts (CRUD de instâncias de contrato)
 *
 * Responsabilidade:
 * - Tipagem forte para criação, listagem e detalhe de contratos multi-tipo.
 * - Schemas para fair links (MULTI_FAIR).
 *
 * Tipos de contrato:
 * - FAIR_DEFAULT: contrato padrão da feira
 * - MULTI_FAIR: contrato unificado para 2+ feiras
 * - EXHIBITOR_SPECIFIC: contrato personalizado para um expositor
 */
import { z } from "zod"
import { ContractTypeSchema } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

export { ContractTypeSchema }

/** DTO para criar contrato */
export const CreateContractInputSchema = z.object({
  ownerFairId: z.string().min(1, "ownerFairId é obrigatório."),
  templateId: z.string().min(1, "templateId é obrigatório."),
  type: ContractTypeSchema,
  title: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  linkedFairIds: z.array(z.string()).optional(),
})
export type CreateContractInput = z.infer<typeof CreateContractInputSchema>

/** Fair link (para MULTI_FAIR) */
export const ContractFairLinkSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  fairId: z.string(),
  ownerFairId: z.string().nullable(),
  createdAt: z.string().datetime(),
})
export type ContractFairLink = z.infer<typeof ContractFairLinkSchema>

/** DTO para adicionar fair link */
export const AddFairLinkInputSchema = z.object({
  fairId: z.string().min(1, "fairId é obrigatório."),
  ownerFairId: z.string().optional(),
})
export type AddFairLinkInput = z.infer<typeof AddFairLinkInputSchema>

/**
 * Contrato retornado na listagem por feira/owner.
 * Formato leve (sem content do template).
 */
export const ContractListResponseItemSchema = z.object({
  id: z.string(),
  ownerFairId: z.string(),
  templateId: z.string(),
  addendumTemplateId: z.string().nullable().optional(),
  type: ContractTypeSchema,
  title: z.string().nullable(),
  notes: z.string().nullable().optional(),

  pdfPath: z.string().nullable(),
  assinafyDocumentId: z.string().nullable().optional(),

  signedAt: z.string().datetime().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Nested relations (optional, depending on endpoint)
  owner: z
    .object({
      id: z.string(),
      ownerId: z.string().optional(),
      fairId: z.string().optional(),
      owner: z
        .object({
          id: z.string(),
          fullName: z.string().nullable().optional(),
          document: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),

  template: z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
    })
    .optional(),

  fairLinks: z.array(ContractFairLinkSchema).optional().default([]),
})
export type ContractListResponseItem = z.infer<typeof ContractListResponseItemSchema>

export const ContractListResponseSchema = z.array(ContractListResponseItemSchema)
export type ContractListResponse = z.infer<typeof ContractListResponseSchema>

/**
 * Contrato detalhado (GET /contracts/:id).
 * Inclui template completo e fair links.
 */
export const ContractDetailSchema = ContractListResponseItemSchema.extend({
  template: z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      isAddendum: z.boolean().optional(),
      hasRegistration: z.boolean().optional(),
      content: z.any().optional(),
    })
    .optional(),

  addendumTemplate: z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
    })
    .nullable()
    .optional(),
})
export type ContractDetail = z.infer<typeof ContractDetailSchema>
