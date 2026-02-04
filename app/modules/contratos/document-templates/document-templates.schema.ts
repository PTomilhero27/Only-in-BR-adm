/**
 * Contratos > Document Templates (painel administrativo)
 *
 * Responsabilidade:
 * - Tipagem forte para templates de contrato (summary e full).
 * - Evitar contratos implícitos com o backend.
 * - Preparar o "content" para edição/preview com Rich Text (Tiptap) em JSON.
 *
 * Observação importante:
 * - A listagem usa "summary" (sem content).
 * - A edição usa "full" (com content).
 */
import { z } from "zod"

export const DocumentTemplateStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
export type DocumentTemplateStatus = z.infer<typeof DocumentTemplateStatusSchema>

export const TiptapJsonSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.any()).optional(),
  })
  .passthrough()

export type TiptapJson = z.infer<typeof TiptapJsonSchema>

export const ContractClauseItemSchema = z.object({
  id: z.string(),
  number: z.string().min(1),
  richText: TiptapJsonSchema,
  text: z.string().optional(),
})
export type ContractClauseItem = z.infer<typeof ContractClauseItemSchema>

export const ContractClauseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("clause"),
  order: z.number().int().min(1),
  title: z.string().min(1),
  items: z.array(ContractClauseItemSchema).default([]),
})
export type ContractClauseBlock = z.infer<typeof ContractClauseBlockSchema>

export const ContractFreeTextBlockSchema = z.object({
  id: z.string(),
  type: z.literal("freeText"),
  order: z.number().int().min(1),
  richText: TiptapJsonSchema,
})
export type ContractFreeTextBlock = z.infer<typeof ContractFreeTextBlockSchema>

export const ContractBlockSchema = z.discriminatedUnion("type", [
  ContractClauseBlockSchema,
  ContractFreeTextBlockSchema,
])
export type ContractBlock = z.infer<typeof ContractBlockSchema>

export const ContractContentSchema = z.object({
  version: z.number().int().min(1).default(1),
  blocks: z.array(ContractBlockSchema).default([]),
})
export type ContractContent = z.infer<typeof ContractContentSchema>

export const DocumentTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  isAddendum: z.boolean(),
  hasRegistration: z.boolean(),
  status: DocumentTemplateStatusSchema,
  content: ContractContentSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>

export const DocumentTemplateSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  isAddendum: z.boolean(),
  hasRegistration: z.boolean(),
  status: DocumentTemplateStatusSchema,
  usage: z.object({
    fairsCount: z.number(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type DocumentTemplateSummary = z.infer<typeof DocumentTemplateSummarySchema>

export const ListDocumentTemplatesQuerySchema = z.object({
  status: DocumentTemplateStatusSchema.optional(),
  isAddendum: z.boolean().optional(),
  mode: z.enum(["full", "summary"]).optional(),
})
export type ListDocumentTemplatesQuery = z.infer<typeof ListDocumentTemplatesQuerySchema>

export const ListDocumentTemplatesSummaryResponseSchema = z.array(DocumentTemplateSummarySchema)
export type ListDocumentTemplatesSummaryResponse = z.infer<
  typeof ListDocumentTemplatesSummaryResponseSchema
>

export const CreateDocumentTemplateInputSchema = z.object({
  title: z.string().min(1, "Informe um título.").max(200, "Máx. 200 caracteres."),
  isAddendum: z.boolean().optional(),
  hasRegistration: z.boolean().optional(),
  status: DocumentTemplateStatusSchema.optional(),
  content: ContractContentSchema.default({ version: 1, blocks: [] }),
})
export type CreateDocumentTemplateInput = z.infer<typeof CreateDocumentTemplateInputSchema>

export const UpdateDocumentTemplateInputSchema = z.object({
  title: z.string().min(1, "Informe um título.").max(200, "Máx. 200 caracteres.").optional(),
  isAddendum: z.boolean().optional(),
  hasRegistration: z.boolean().optional(),
  status: DocumentTemplateStatusSchema.optional(),
  content: ContractContentSchema.optional(),
})
export type UpdateDocumentTemplateInput = z.infer<typeof UpdateDocumentTemplateInputSchema>

export function documentTemplateStatusLabel(status: DocumentTemplateStatus) {
  switch (status) {
    case "DRAFT":
      return "Rascunho"
    case "PUBLISHED":
      return "Publicado"
    case "ARCHIVED":
      return "Arquivado"
    default:
      return status
  }
}

export function documentTemplateTypeLabel(isAddendum: boolean) {
  return isAddendum ? "Aditivo" : "Contrato"
}
