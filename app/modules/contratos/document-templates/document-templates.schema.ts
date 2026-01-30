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

/**
 * -------------------------
 * STATUS
 * -------------------------
 */
export const DocumentTemplateStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
])
export type DocumentTemplateStatus = z.infer<
  typeof DocumentTemplateStatusSchema
>

/**
 * -------------------------
 * TIPTAP (Rich Text JSON)
 * -------------------------
 *
 * Decisão:
 * - Validamos minimamente como um "doc" do ProseMirror/Tiptap.
 * - Usamos .passthrough() para permitir extensões futuras (ex.: underline, tables, etc.).
 * - Mantemos como JSON (não HTML), alinhado com backend e com snapshot/PDF no futuro.
 */
export const TiptapJsonSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.any()).optional(),
  })
  .passthrough()

export type TiptapJson = z.infer<typeof TiptapJsonSchema>

/**
 * -------------------------
 * CONTENT (modelo por blocos)
 * -------------------------
 *
 * Modelo atual:
 * {
 *   version: 1,
 *   blocks: [
 *     { id, type: "clause", order, title, items: [{ id, number, richText }] },
 *     { id, type: "freeText", order, richText }
 *   ]
 * }
 *
 * Nota:
 * - Mantive "text" opcional em ClauseItem para migração suave (legado).
 * - Você pode remover "text" depois que todas as edições passarem a salvar richText.
 */

export const ContractClauseItemSchema = z.object({
  id: z.string(),
  /**
   * Ex.: "1.1", "1.2" etc.
   * O front pode recomputar/normalizar quando reordenar/remover itens.
   */
  number: z.string().min(1),

  /**
   * Rich text do inciso (Tiptap JSON).
   * Obrigatório para UX (não permitir salvar vazio).
   */
  richText: TiptapJsonSchema,

  /**
   * Legado (caso existam dados antigos em string).
   * Preferimos richText sempre que possível.
   */
  text: z.string().optional(),
})

export type ContractClauseItem = z.infer<typeof ContractClauseItemSchema>

export const ContractClauseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("clause"),
  order: z.number().int().min(1),

  /**
   * Ex.: "CLÁUSULA 1 – OBJETO"
   */
  title: z.string().min(1),

  items: z.array(ContractClauseItemSchema).default([]),
})

export type ContractClauseBlock = z.infer<typeof ContractClauseBlockSchema>

export const ContractFreeTextBlockSchema = z.object({
  id: z.string(),
  type: z.literal("freeText"),
  order: z.number().int().min(1),

  /**
   * Rich text do bloco livre (Tiptap JSON).
   */
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

/**
 * -------------------------
 * FULL (GET /:id)
 * -------------------------
 */
export const DocumentTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),

  isAddendum: z.boolean(),
  hasRegistration: z.boolean(),
  status: DocumentTemplateStatusSchema,

  /**
   * JSON do editor (controlado pelo front)
   * Agora com contrato explícito (version + blocks).
   */
  content: ContractContentSchema,

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>

/**
 * -------------------------
 * SUMMARY (GET ?mode=summary)
 * -------------------------
 */
export const DocumentTemplateSummarySchema = z.object({
  id: z.string(),
  title: z.string(),

  isAddendum: z.boolean(),
  hasRegistration: z.boolean(),
  status: DocumentTemplateStatusSchema,

  /**
   * Quantas feiras usam este template
   */
  usage: z.object({
    fairsCount: z.number(),
  }),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type DocumentTemplateSummary = z.infer<
  typeof DocumentTemplateSummarySchema
>

/**
 * -------------------------
 * LIST QUERY PARAMS
 * -------------------------
 */
export const ListDocumentTemplatesQuerySchema = z.object({
  status: DocumentTemplateStatusSchema.optional(),
  isAddendum: z.boolean().optional(),

  /**
   * full = retorna content
   * summary = payload leve para cards/tabela
   */
  mode: z.enum(["full", "summary"]).optional(),
})
export type ListDocumentTemplatesQuery = z.infer<
  typeof ListDocumentTemplatesQuerySchema
>

/**
 * -------------------------
 * LIST RESPONSES
 * -------------------------
 */
export const ListDocumentTemplatesSummaryResponseSchema = z.array(
  DocumentTemplateSummarySchema,
)
export type ListDocumentTemplatesSummaryResponse = z.infer<
  typeof ListDocumentTemplatesSummaryResponseSchema
>

/**
 * -------------------------
 * CREATE / UPDATE
 * -------------------------
 *
 * Decisão:
 * - No create, permitimos omitir content e geramos um default no front (ou aqui via default()).
 * - No update, content pode ser parcial, mas como o backend recebe JSON, normalmente mandamos o content inteiro.
 */

export const CreateDocumentTemplateInputSchema = z.object({
  title: z
    .string()
    .min(1, "Informe um título.")
    .max(200, "Máx. 200 caracteres."),

  isAddendum: z.boolean().optional(),
  hasRegistration: z.boolean().optional(),
  status: DocumentTemplateStatusSchema.optional(),

  /**
   * Conteúdo do editor (JSON).
   * Se você quiser iniciar vazio, pode usar default abaixo e permitir omitir no input.
   */
  content: ContractContentSchema.default({ version: 1, blocks: [] }),
})
export type CreateDocumentTemplateInput = z.infer<
  typeof CreateDocumentTemplateInputSchema
>

export const UpdateDocumentTemplateInputSchema = z.object({
  title: z
    .string()
    .min(1, "Informe um título.")
    .max(200, "Máx. 200 caracteres.")
    .optional(),

  isAddendum: z.boolean().optional(),
  hasRegistration: z.boolean().optional(),
  status: DocumentTemplateStatusSchema.optional(),

  /**
   * PATCH aceita conteúdo parcial ou completo.
   * Na prática: enviar content inteiro evita merge complexo e previne inconsistências.
   */
  content: ContractContentSchema.optional(),
})
export type UpdateDocumentTemplateInput = z.infer<
  typeof UpdateDocumentTemplateInputSchema
>

/**
 * -------------------------
 * HELPERS DE UI
 * -------------------------
 */
export function documentTemplateStatusLabel(
  status: DocumentTemplateStatus,
) {
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
