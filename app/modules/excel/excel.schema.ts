// src/modules/excel/excel.schema.ts
/**
 * Módulo Excel (Admin)
 * Responsabilidade:
 * - Centralizar o "contrato" do front com o backend de Excel (datasets/templates/exports)
 * - Validar payloads via Zod para evitar contratos implícitos e bugs silenciosos
 *
 * Observação:
 * - O core de geração está no backend, aqui só tipamos e consumimos endpoints.
 */
import { z } from "zod"

/** =========================
 * ENUMS (domínio Excel)
 * ========================= */

export const ExcelTemplateStatusSchema = z.enum(["ACTIVE", "INACTIVE"])
export type ExcelTemplateStatus = z.infer<typeof ExcelTemplateStatusSchema>

export const ExcelCellTypeSchema = z.enum(["TEXT", "BIND"])
export type ExcelCellType = z.infer<typeof ExcelCellTypeSchema>

export const ExcelValueFormatSchema = z.enum(["TEXT", "INT", "MONEY_CENTS", "DATE", "DATETIME", "BOOL"])
export type ExcelValueFormat = z.infer<typeof ExcelValueFormatSchema>

export const ExcelDatasetSchema = z.enum([
  "FAIR",
  "FAIR_EXHIBITORS",
  "FAIR_STALLS",
  "FAIR_FINANCIAL",
])
export type ExcelDataset = z.infer<typeof ExcelDatasetSchema>

/** =========================
 * DATASETS
 * ========================= */

/**
 * Item do catálogo de datasets (para o builder).
 * O label pode ser definido no backend para UX melhor no front.
 */
export const ExcelDatasetItemSchema = z.object({
  dataset: ExcelDatasetSchema,
  label: z.string().optional(),
  description: z.string().optional(),
})
export type ExcelDatasetItem = z.infer<typeof ExcelDatasetItemSchema>

/**
 * GET /excel/datasets
 */
export const ExcelDatasetsResponseSchema = z.object({
  items: z.array(ExcelDatasetItemSchema),
})
export type ExcelDatasetsResponse = z.infer<typeof ExcelDatasetsResponseSchema>

/**
 * Field disponível para bind.
 * - fieldKey: chave (ex.: "owner.fullName")
 * - label: nome exibido no builder
 * - format: formato padrão sugerido pelo catálogo
 */
export const ExcelDatasetFieldSchema = z.object({
  fieldKey: z.string(),
  label: z.string(),
  format: ExcelValueFormatSchema.optional(),
  description: z.string().optional(),
})
export type ExcelDatasetField = z.infer<typeof ExcelDatasetFieldSchema>

/**
 * GET /excel/datasets/:dataset/fields
 */
export const ExcelDatasetFieldsResponseSchema = z.object({
  dataset: ExcelDatasetSchema,
  fields: z.array(ExcelDatasetFieldSchema),
})
export type ExcelDatasetFieldsResponse = z.infer<typeof ExcelDatasetFieldsResponseSchema>

/** =========================
 * TEMPLATES (CRUD)
 * ========================= */

export const ExcelTemplateCellSchema = z.object({
  id: z.string(),
  row: z.number().int().positive(),
  col: z.number().int().positive(),
  type: ExcelCellTypeSchema,
  value: z.string(),
  format: ExcelValueFormatSchema.nullable().optional(),
  bold: z.boolean().optional(),
})
export type ExcelTemplateCell = z.infer<typeof ExcelTemplateCellSchema>

export const ExcelTemplateTableColumnSchema = z.object({
  id: z.string(),
  order: z.number().int().nonnegative(),
  header: z.string(),
  fieldKey: z.string(),
  format: ExcelValueFormatSchema.nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
})
export type ExcelTemplateTableColumn = z.infer<typeof ExcelTemplateTableColumnSchema>

export const ExcelTemplateTableSchema = z.object({
  id: z.string(),
  anchorRow: z.number().int().positive(),
  anchorCol: z.number().int().positive(),
  dataset: ExcelDatasetSchema,
  includeHeader: z.boolean(),
  columns: z.array(ExcelTemplateTableColumnSchema),
})
export type ExcelTemplateTable = z.infer<typeof ExcelTemplateTableSchema>

export const ExcelTemplateSheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int().nonnegative(),
  dataset: ExcelDatasetSchema,
  cells: z.array(ExcelTemplateCellSchema),
  tables: z.array(ExcelTemplateTableSchema),
})
export type ExcelTemplateSheet = z.infer<typeof ExcelTemplateSheetSchema>

export const ExcelTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ExcelTemplateStatusSchema,
  sheets: z.array(ExcelTemplateSheetSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type ExcelTemplate = z.infer<typeof ExcelTemplateSchema>

/**
 * Listagem (tela de templates).
 * Pode ser “resumida” pra evitar payload grande.
 */
export const ExcelTemplateListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ExcelTemplateStatusSchema,
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime().optional(),
})
export type ExcelTemplateListItem = z.infer<typeof ExcelTemplateListItemSchema>

/**
 * GET /excel-templates
 */
export const ExcelTemplatesListResponseSchema = z.object({
  items: z.array(ExcelTemplateListItemSchema),
})
export type ExcelTemplatesListResponse = z.infer<typeof ExcelTemplatesListResponseSchema>

/**
 * GET /excel-templates/:id
 */
export const ExcelTemplateGetResponseSchema = z.object({
  template: ExcelTemplateSchema,
})
export type ExcelTemplateGetResponse = z.infer<typeof ExcelTemplateGetResponseSchema>

/**
 * Inputs de criação/atualização.
 * Observação:
 * - No MVP, se enviar `sheets` no PATCH, o backend substitui a estrutura inteira (replace total).
 * - Por isso o input já é “completo”, e o front manda a estrutura inteira.
 */
export const ExcelTemplateCellInputSchema = z.object({
  row: z.number().int().positive(),
  col: z.number().int().positive(),
  type: ExcelCellTypeSchema,
  value: z.string(),
  format: ExcelValueFormatSchema.nullable().optional(),
  bold: z.boolean().optional(),
})
export type ExcelTemplateCellInput = z.infer<typeof ExcelTemplateCellInputSchema>

export const ExcelTemplateTableColumnInputSchema = z.object({
  order: z.number().int().nonnegative(),
  header: z.string().min(1),
  fieldKey: z.string().min(1),
  format: ExcelValueFormatSchema.nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
})
export type ExcelTemplateTableColumnInput = z.infer<typeof ExcelTemplateTableColumnInputSchema>

export const ExcelTemplateTableInputSchema = z.object({
  anchorRow: z.number().int().positive(),
  anchorCol: z.number().int().positive(),
  dataset: ExcelDatasetSchema,
  includeHeader: z.boolean().optional(),
  columns: z.array(ExcelTemplateTableColumnInputSchema),
})
export type ExcelTemplateTableInput = z.infer<typeof ExcelTemplateTableInputSchema>

export const ExcelTemplateSheetInputSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
  dataset: ExcelDatasetSchema,
  cells: z.array(ExcelTemplateCellInputSchema).optional(),
  tables: z.array(ExcelTemplateTableInputSchema).optional(),
})
export type ExcelTemplateSheetInput = z.infer<typeof ExcelTemplateSheetInputSchema>

export const CreateExcelTemplateInputSchema = z.object({
  name: z.string().min(1),
  status: ExcelTemplateStatusSchema.optional(),
  sheets: z.array(ExcelTemplateSheetInputSchema).min(1, "Informe pelo menos 1 aba."),
})
export type CreateExcelTemplateInput = z.infer<typeof CreateExcelTemplateInputSchema>

export const UpdateExcelTemplateInputSchema = z.object({
  name: z.string().min(1).optional(),
  status: ExcelTemplateStatusSchema.optional(),

  /**
   * Se enviado, substitui toda estrutura no MVP.
   * Recomendação: sempre enviar completo quando user editar no builder.
   */
  sheets: z.array(ExcelTemplateSheetInputSchema).optional(),
})
export type UpdateExcelTemplateInput = z.infer<typeof UpdateExcelTemplateInputSchema>

/**
 * POST /excel-templates
 */
export const CreateExcelTemplateResponseSchema = z.object({
  template: ExcelTemplateSchema,
})
export type CreateExcelTemplateResponse = z.infer<typeof CreateExcelTemplateResponseSchema>

/**
 * PATCH /excel-templates/:id
 */
export const UpdateExcelTemplateResponseSchema = z.object({
  template: ExcelTemplateSchema,
})
export type UpdateExcelTemplateResponse = z.infer<typeof UpdateExcelTemplateResponseSchema>

/**
 * DELETE /excel-templates/:id
 * (shape pode variar, mantemos simples e resiliente)
 */
export const DeleteExcelTemplateResponseSchema = z.object({
  ok: z.boolean().optional(),
})
export type DeleteExcelTemplateResponse = z.infer<typeof DeleteExcelTemplateResponseSchema>

/** =========================
 * EXPORTS
 * ========================= */

/**
 * POST /excel-exports
 * Endpoint retorna arquivo (não JSON).
 */
export const CreateExcelExportInputSchema = z.object({
  templateId: z.string().min(1),
  fairId: z.string().min(1),
  ownerId: z.string().min(1).optional(),
})
export type CreateExcelExportInput = z.infer<typeof CreateExcelExportInputSchema>

/**
 * Helpers UI
 */
export function excelDatasetLabel(dataset: ExcelDataset) {
  switch (dataset) {
    case "FAIR":
      return "Feira"
    case "FAIR_EXHIBITORS":
      return "Expositores da feira"
    case "FAIR_STALLS":
      return "Barracas da feira"
    case "FAIR_FINANCIAL":
      return "Financeiro da feira"
    default:
      return dataset
  }
}

export function excelValueFormatLabel(format: ExcelValueFormat) {
  switch (format) {
    case "TEXT":
      return "Texto"
    case "INT":
      return "Número"
    case "MONEY_CENTS":
      return "Dinheiro (centavos)"
    case "DATE":
      return "Data"
    case "DATETIME":
      return "Data e hora"
    case "BOOL":
      return "Sim/Não"
    default:
      return format
  }
}
