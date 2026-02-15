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
  const data = await api.get("excel-templates")

  // ✅ normaliza formatos possíveis
  const normalized = Array.isArray(data) ? { items: data } : data

  return ExcelTemplatesListResponseSchema.parse(normalized)
}

/**
 * GET /excel-templates/:id
 * ✅ normaliza: backend pode retornar direto o template (sem wrapper { template })
 */
export async function getExcelTemplate(templateId: string): Promise<ExcelTemplateGetResponse> {
  const data = await api.get(`excel-templates/${templateId}`)

  const normalized =
    data && typeof data === "object" && "template" in (data as any)
      ? data
      : { template: data }

  return ExcelTemplateGetResponseSchema.parse(normalized)
}

/**
 * POST /excel-templates
 */
export async function createExcelTemplate(
  input: CreateExcelTemplateInput,
): Promise<CreateExcelTemplateResponse> {
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
 * ✅ Se você já tiver `api.postBlob`, prefira ele.
 * Aqui mantém fetch direto para não quebrar o parser JSON do wrapper.
 */
export async function createExcelExport(input: CreateExcelExportInput): Promise<Blob> {
  const payload = CreateExcelExportInputSchema.parse(input)

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
    const text = await res.text().catch(() => "")
    throw new Error(text || `Falha ao gerar Excel (HTTP ${res.status}).`)
  }

  return await res.blob()
}
