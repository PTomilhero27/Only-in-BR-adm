/**
 * Excel Service (Admin)
 *
 * Responsabilidade:
 * - Centralizar chamadas do módulo Excel no painel admin
 * - Usar o wrapper `api` (ele já injeta Authorization automaticamente)
 * - Validar retornos com Zod quando aplicável
 * - Exportar arquivo .xlsx como Blob via responseType: "blob"
 */
import { api } from "@/app/shared/http/api";
import {
  ExcelDatasetSchema,
  ExcelDatasetsResponseSchema,
  ExcelDatasetFieldsResponseSchema,
  ExcelTemplatesListResponseSchema,
  ExcelTemplateSchema,
  CreateExcelTemplateInputSchema,
  UpdateExcelTemplateInputSchema,
  CreateExcelExportInputSchema,
  ExcelExportRequirementsResponseSchema,
  type ExcelDatasetsResponse,
  type ExcelDatasetFieldsResponse,
  type ExcelTemplatesListResponse,
  type ExcelTemplate,
  type CreateExcelTemplateInput,
  type UpdateExcelTemplateInput,
  type CreateExcelExportInput,
  type ExcelExportRequirementsResponse,
} from "./excel.schema";

/** =========================
 * Helpers internos
 * ========================= */

function ensureArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/** =========================
 * DATASETS
 * ========================= */

/**
 * GET /excel/datasets
 */
export async function listExcelDatasets(): Promise<ExcelDatasetsResponse> {
  return api.get("excel/datasets", ExcelDatasetsResponseSchema);
}

/**
 * GET /excel/datasets/:dataset/fields
 */
export async function listExcelDatasetFields(
  dataset: string,
): Promise<ExcelDatasetFieldsResponse> {
  const parsed = ExcelDatasetSchema.parse(dataset);
  return api.get(
    `excel/datasets/${parsed}/fields`,
    ExcelDatasetFieldsResponseSchema,
  );
}

/** =========================
 * EXPORT REQUIREMENTS
 * ========================= */

/**
 * GET /excel-export-requirements/:templateId
 *
 * Observação:
 * - Forçamos cache: "no-store" para evitar 304 Not Modified,
 *   garantindo que sempre teremos um JSON para parsear.
 */
export async function getExcelExportRequirements(
  templateId: string,
): Promise<ExcelExportRequirementsResponse> {
  return api.get(
    `excel-export-requirements/${templateId}`,
    ExcelExportRequirementsResponseSchema,
    { cache: "no-store" },
  );
}

/** =========================
 * TEMPLATES (CRUD)
 * ========================= */

/**
 * GET /excel-templates
 */
export async function listExcelTemplates(): Promise<ExcelTemplatesListResponse> {
  const data = await api.get("excel-templates");
  return ExcelTemplatesListResponseSchema.parse(ensureArray(data));
}

/**
 * GET /excel-templates/:templateId
 */
export async function getExcelTemplate(
  templateId: string,
): Promise<ExcelTemplate> {
  return api.get(`excel-templates/${templateId}`, ExcelTemplateSchema);
}

/**
 * POST /excel-templates
 */
export async function createExcelTemplate(
  input: CreateExcelTemplateInput,
): Promise<ExcelTemplate> {
  const payload = CreateExcelTemplateInputSchema.parse(input);
  const data = await api.post("excel-templates", payload);
  return ExcelTemplateSchema.parse(data);
}

/**
 * PATCH /excel-templates/:templateId
 */
export async function updateExcelTemplate(params: {
  templateId: string;
  input: UpdateExcelTemplateInput;
}): Promise<ExcelTemplate> {
  const payload = UpdateExcelTemplateInputSchema.parse(params.input);
  const data = await api.patch(`excel-templates/${params.templateId}`, payload);
  return ExcelTemplateSchema.parse(data);
}

/**
 * DELETE /excel-templates/:templateId
 */
export async function deleteExcelTemplate(
  templateId: string,
): Promise<{ ok: boolean }> {
  await api.delete(`excel-templates/${templateId}`);
  return { ok: true };
}

/** =========================
 * EXPORTS
 * ========================= */

/**
 * POST /excel-exports
 *
 * Importante:
 * - O backend espera: { templateId, scope: { fairId?, ownerId?, stallId? } }
 * - Retorna Blob (.xlsx)
 */
export async function createExcelExport(
  input: CreateExcelExportInput,
): Promise<Blob> {
  const payload = CreateExcelExportInputSchema.parse(input);

  return api.post<Blob>("excel-exports", payload, {
    responseType: "blob",
  });
}
