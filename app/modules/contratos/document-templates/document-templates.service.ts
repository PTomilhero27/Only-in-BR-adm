/**
 * Contratos > Document Templates
 *
 * Responsabilidade:
 * - Centralizar chamadas HTTP para o backend (CRUD de templates).
 * - Validar entradas (inputs) com Zod antes de enviar.
 * - Validar saídas (responses) com Zod após receber.
 *
 * Motivo:
 * - Evitar contratos implícitos e quebrar silenciosamente quando o back mudar.
 */
import { api } from "@/app/shared/http/api"
import {
  CreateDocumentTemplateInputSchema,
  type CreateDocumentTemplateInput,
  DocumentTemplateSchema,
  type DocumentTemplate,
  ListDocumentTemplatesQuerySchema,
  type ListDocumentTemplatesQuery,
  ListDocumentTemplatesSummaryResponseSchema,
  type ListDocumentTemplatesSummaryResponse,
  UpdateDocumentTemplateInputSchema,
  type UpdateDocumentTemplateInput,
} from "./document-templates.schema"

/**
 * Helper para montar querystring sem “gambiarras”.
 * Observação: o backend aceita status, isAddendum e mode.
 */
function toQueryString(query?: ListDocumentTemplatesQuery) {
  if (!query) return ""

  const parsed = ListDocumentTemplatesQuerySchema.parse(query)
  const qs = new URLSearchParams()

  if (parsed.status) qs.set("status", parsed.status)
  if (typeof parsed.isAddendum === "boolean") qs.set("isAddendum", String(parsed.isAddendum))
  if (parsed.mode) qs.set("mode", parsed.mode)

  const built = qs.toString()
  return built ? `?${built}` : ""
}

/**
 * GET /document-templates
 *
 * Decisão:
 * - Esta função é para LISTAGEM.
 * - A listagem do painel deve usar mode=summary para ser leve e trazer usage.fairsCount.
 */
export async function listDocumentTemplates(
  query?: ListDocumentTemplatesQuery,
): Promise<ListDocumentTemplatesSummaryResponse> {
  const qs = toQueryString(query)
  return api.get(`document-templates${qs}`, ListDocumentTemplatesSummaryResponseSchema)
}

/**
 * GET /document-templates/:id
 * Busca template por ID (para editar/visualizar).
 *
 * Observação: aqui é FULL (inclui content).
 */
export async function getDocumentTemplateById(id: string): Promise<DocumentTemplate> {
  return api.get(`document-templates/${id}`, DocumentTemplateSchema)
}

/**
 * POST /document-templates
 * Cria um template global (contrato ou aditivo).
 */
export async function createDocumentTemplate(
  input: CreateDocumentTemplateInput,
): Promise<DocumentTemplate> {
  const parsed = CreateDocumentTemplateInputSchema.parse(input)
  const data = await api.post("document-templates", parsed)
  return DocumentTemplateSchema.parse(data)
}

/**
 * PATCH /document-templates/:id
 * Atualiza metadados e/ou conteúdo do template.
 */
export async function updateDocumentTemplate(params: {
  id: string
  input: UpdateDocumentTemplateInput
}): Promise<DocumentTemplate> {
  const parsed = UpdateDocumentTemplateInputSchema.parse(params.input)
  const data = await api.patch(`document-templates/${params.id}`, parsed)
  return DocumentTemplateSchema.parse(data)
}

/**
 * DELETE /document-templates/:id
 * Remove o template.
 */
export async function deleteDocumentTemplate(id: string): Promise<DocumentTemplate> {
  const data = await api.delete(`document-templates/${id}`)
  return DocumentTemplateSchema.parse(data)
}
