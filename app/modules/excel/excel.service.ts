// src/modules/excel/excel.service.ts
import { api } from "@/app/shared/http/api"
import {
  ExcelDatasetsResponseSchema,
  type ExcelDatasetsResponse,
  ExcelDatasetSchema,
  ExcelDatasetFieldsResponseSchema,
  type ExcelDatasetFieldsResponse,

  CreateExcelTemplateInputSchema,
  type CreateExcelTemplateInput,
  CreateExcelTemplateResponseSchema,
  type CreateExcelTemplateResponse,

  UpdateExcelTemplateInputSchema,
  type UpdateExcelTemplateInput,
  UpdateExcelTemplateResponseSchema,
  type UpdateExcelTemplateResponse,

  ExcelTemplatesListResponseSchema,
  type ExcelTemplatesListResponse,

  ExcelTemplateGetResponseSchema,
  type ExcelTemplateGetResponse,

  DeleteExcelTemplateResponseSchema,
  type DeleteExcelTemplateResponse,

  CreateExcelExportInputSchema,
  type CreateExcelExportInput,
} from "./excel.schema"

/**
 * Excel Service (Admin)
 * Responsabilidade:
 * - Encapsular chamadas HTTP do módulo Excel
 * - Validar inputs com Zod
 * - Parsear outputs com Zod sempre que houver JSON
 *
 * Observação importante:
 * - POST /excel-exports retorna arquivo (Blob). Não há schema Zod para isso.
 */

/** =========================
 * DATASETS
 * ========================= */

/**
 * GET /excel/datasets
 */
export async function listExcelDatasets(): Promise<ExcelDatasetsResponse> {
  return api.get("excel/datasets", ExcelDatasetsResponseSchema)
}

/**
 * GET /excel/datasets/:dataset/fields
 */
export async function listExcelDatasetFields(dataset: string): Promise<ExcelDatasetFieldsResponse> {
  const parsed = ExcelDatasetSchema.parse(dataset)
  return api.get(`excel/datasets/${parsed}/fields`, ExcelDatasetFieldsResponseSchema)
}

/** =========================
 * TEMPLATES (CRUD)
 * ========================= */

/**
 * GET /excel-templates
 */
export async function listExcelTemplates(): Promise<ExcelTemplatesListResponse> {
  return api.get("excel-templates", ExcelTemplatesListResponseSchema)
}

/**
 * GET /excel-templates/:id
 */
export async function getExcelTemplate(templateId: string): Promise<ExcelTemplateGetResponse> {
  return api.get(`excel-templates/${templateId}`, ExcelTemplateGetResponseSchema)
}

/**
 * POST /excel-templates
 */
export async function createExcelTemplate(input: CreateExcelTemplateInput): Promise<CreateExcelTemplateResponse> {
  const payload = CreateExcelTemplateInputSchema.parse(input)

  const data = await api.post("excel-templates", payload)

  const normalized =
    data && typeof data === "object" && "template" in (data as any)
      ? data
      : { template: data }

  return CreateExcelTemplateResponseSchema.parse(normalized)
}

/**
 * PATCH /excel-templates/:id
 * MVP: se enviar `sheets`, o backend substitui a estrutura inteira.
 */
export async function updateExcelTemplate(params: {
  templateId: string
  input: UpdateExcelTemplateInput
}): Promise<UpdateExcelTemplateResponse> {
  const payload = UpdateExcelTemplateInputSchema.parse(params.input)

  const data = await api.patch(`excel-templates/${params.templateId}`, payload)

  const normalized =
    data && typeof data === "object" && "template" in (data as any)
      ? data
      : { template: data }

  return UpdateExcelTemplateResponseSchema.parse(normalized)
}

/**
 * DELETE /excel-templates/:id
 */
export async function deleteExcelTemplate(templateId: string): Promise<DeleteExcelTemplateResponse> {
  const data = await api.delete(`excel-templates/${templateId}`)
  const normalized = data && typeof data === "object" ? data : { ok: true }
  return DeleteExcelTemplateResponseSchema.parse(normalized)
}

/** =========================
 * EXPORTS
 * ========================= */

/**
 * POST /excel-exports
 * Retorna arquivo .xlsx (Blob) — não retorna JSON.
 *
 * Importante:
 * - Como seu wrapper `api` normalmente parseia JSON, aqui usamos `fetch` direto.
 * - Mantemos o input validado com Zod.
 *
 * ✅ Como usar no front:
 * const blob = await createExcelExport({ templateId, fairId, ownerId })
 * const url = URL.createObjectURL(blob)
 * ... criar <a download> ...
 */
export async function createExcelExport(input: CreateExcelExportInput): Promise<Blob> {
  const payload = CreateExcelExportInputSchema.parse(input)

  /**
   * Estratégia:
   * - Reusar baseURL do api (se existir), senão cair para `process.env...`
   * - Reusar token atual (se seu `api` expõe), senão aceitar sem token (não ideal)
   *
   * Ajuste fino:
   * - Se você tiver no seu projeto algo tipo `api.getAccessToken()` ou `tokenStore.get()`,
   *   plugue aqui para manter 100% autenticado.
   */
  const baseUrl =
    // @ts-expect-error - nem todo wrapper expõe, mas tentamos reaproveitar se existir
    (api.baseUrl as string | undefined) ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""

  // @ts-expect-error - opcional, caso seu wrapper exponha o token
  const token: string | undefined = api.getAccessToken?.()

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/excel-exports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    // Tentamos ler mensagem de erro (se backend retornar JSON)
    const text = await res.text().catch(() => "")
    throw new Error(text || `Falha ao gerar Excel (HTTP ${res.status}).`)
  }

  return await res.blob()
}
