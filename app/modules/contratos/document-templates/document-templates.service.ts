/**
 * Contratos > Document Templates
 *
 * Responsabilidade:
 * - Centralizar chamadas HTTP para o backend (CRUD de templates).
 * - Validar entradas (inputs) com Zod antes de enviar.
 * - Validar saídas (responses) com Zod após receber.
 *
 * Decisão:
 * - Normalizamos o "content" para evitar quebrar em templates legados (sem order).
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
  normalizeContractContent,
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

/**
 * Busca template por ID (modo full).
 *
 * ✅ Importante:
 * - Normalizamos "content" para garantir que blocks tenham order.
 * - Isso evita crash no editor e no fluxo de salvar.
 */
export async function getDocumentTemplateById(id: string): Promise<DocumentTemplate> {
  // ✅ Tipamos a resposta para o TS saber que "content" existe.
  const data = await api.get<DocumentTemplate>(`document-templates/${id}`)

  const normalized: DocumentTemplate = {
    ...data,
    content: normalizeContractContent((data as any)?.content),
  }

  return DocumentTemplateSchema.parse(normalized)
}

/**
 * Cria template.
 *
 * ✅ Importante:
 * - Normalizamos o content antes de validar/enviar.
 */
export async function createDocumentTemplate(
  input: CreateDocumentTemplateInput,
): Promise<DocumentTemplate> {
  const safeInput: CreateDocumentTemplateInput = {
    ...input,
    content: normalizeContractContent(input?.content),
  }

  const parsed = CreateDocumentTemplateInputSchema.parse(safeInput)

  // ✅ Tipamos a resposta
  const data = await api.post<DocumentTemplate>("document-templates", parsed)

  const normalized: DocumentTemplate = {
    ...data,
    content: normalizeContractContent((data as any)?.content),
  }

  return DocumentTemplateSchema.parse(normalized)
}

/**
 * Atualiza template.
 *
 * ✅ Importante:
 * - Se vier content, normalizamos antes do parse (evita order undefined).
 */
export async function updateDocumentTemplate(params: {
  id: string
  input: UpdateDocumentTemplateInput
}): Promise<DocumentTemplate> {
  const safeInput: UpdateDocumentTemplateInput = {
    ...params.input,
    ...(params.input.content
      ? { content: normalizeContractContent(params.input.content) }
      : {}),
  }

  const parsed = UpdateDocumentTemplateInputSchema.parse(safeInput)

  // ✅ Tipamos a resposta para o TS saber que "content" existe.
  const data = await api.patch<DocumentTemplate>(`document-templates/${params.id}`, parsed)

  const normalized: DocumentTemplate = {
    ...data,
    content: normalizeContractContent((data as any)?.content),
  }

  return DocumentTemplateSchema.parse(normalized)
}

export async function deleteDocumentTemplate(id: string): Promise<DocumentTemplate> {
  const data = await api.delete<DocumentTemplate>(`document-templates/${id}`)

  const normalized: DocumentTemplate = {
    ...data,
    content: normalizeContractContent((data as any)?.content),
  }

  return DocumentTemplateSchema.parse(normalized)
}
