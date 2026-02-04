/**
 * Contratos > Document Templates
 *
 * Responsabilidade:
 * - Centralizar chamadas HTTP para o backend (CRUD de templates).
 * - Validar entradas (inputs) com Zod antes de enviar.
 * - Validar saídas (responses) com Zod após receber.
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

export async function listDocumentTemplates(
  query?: ListDocumentTemplatesQuery,
): Promise<ListDocumentTemplatesSummaryResponse> {
  const qs = toQueryString(query)
  return api.get(`document-templates${qs}`, ListDocumentTemplatesSummaryResponseSchema)
}

export async function getDocumentTemplateById(id: string): Promise<DocumentTemplate> {
  return api.get(`document-templates/${id}`, DocumentTemplateSchema)
}

export async function createDocumentTemplate(
  input: CreateDocumentTemplateInput,
): Promise<DocumentTemplate> {
  const parsed = CreateDocumentTemplateInputSchema.parse(input)
  const data = await api.post("document-templates", parsed)
  return DocumentTemplateSchema.parse(data)
}

export async function updateDocumentTemplate(params: {
  id: string
  input: UpdateDocumentTemplateInput
}): Promise<DocumentTemplate> {
  const parsed = UpdateDocumentTemplateInputSchema.parse(params.input)
  const data = await api.patch(`document-templates/${params.id}`, parsed)
  return DocumentTemplateSchema.parse(data)
}

export async function deleteDocumentTemplate(id: string): Promise<DocumentTemplate> {
  const data = await api.delete(`document-templates/${id}`)
  return DocumentTemplateSchema.parse(data)
}
