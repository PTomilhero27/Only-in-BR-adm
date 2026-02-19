/**
 * Módulo Excel (Admin)
 * Contrato Front <-> Back
 *
 * Este arquivo centraliza:
 * - enums compatíveis com Prisma
 * - shapes de retorno (backend)
 * - shapes UI-only (builder)
 * - shapes de INPUT (payload aceito pelo backend)
 *
 * Regra de ouro:
 * - Backend NÃO aceita: mode/gridRows/gridCols/multiColumns
 * - Inputs usam `.strip()` para eliminar extras caso escapem
 */
import { z } from "zod";

/** =========================
 * ENUMS (domínio Excel)
 * ========================= */

export const ExcelTemplateStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export type ExcelTemplateStatus = z.infer<typeof ExcelTemplateStatusSchema>;

export const ExcelCellTypeSchema = z.enum(["TEXT", "BIND"]);
export type ExcelCellType = z.infer<typeof ExcelCellTypeSchema>;

export const ExcelValueFormatSchema = z.enum([
  "TEXT",
  "INT",
  "MONEY_CENTS",
  "DATE",
  "DATETIME",
  "BOOL",
]);
export type ExcelValueFormat = z.infer<typeof ExcelValueFormatSchema>;

export const ExcelSheetModeSchema = z.enum(["SINGLE", "MULTI"]);
export type ExcelSheetMode = z.infer<typeof ExcelSheetModeSchema>;

/**
 * ✅ Dataset (DEVE bater com o enum ExcelDataset do Prisma)
 */
export const ExcelDatasetSchema = z.enum([
  // SINGLE
  "FAIR_INFO",
  "FAIR_SUMMARY",
  "OWNER_INFO",
  "OWNER_SUMMARY",
  "STALL_INFO",
  "STALL_SUMMARY",

  // MULTI
  "FAIR_EXHIBITORS_LIST",
  "FAIR_STALLS_LIST",
  "FAIR_PURCHASES_LIST",
  "OWNER_FAIRS_LIST",
  "OWNER_STALLS_LIST",
  "STALL_FAIRS_LIST",
]);
export type ExcelDataset = z.infer<typeof ExcelDatasetSchema>;

export const ExcelTemplateScopeSchema = z.enum([
  "FAIR",
  "FAIR_OWNER",
  "FAIR_STALL",
  "OWNER",
  "STALL",
]);
export type ExcelTemplateScope = z.infer<typeof ExcelTemplateScopeSchema>;

/** =========================
 * Helpers: SINGLE vs MULTI
 * ========================= */

export const EXCEL_SINGLE_DATASETS: ExcelDataset[] = [
  "FAIR_INFO",
  "FAIR_SUMMARY",
  "OWNER_INFO",
  "OWNER_SUMMARY",
  "STALL_INFO",
  "STALL_SUMMARY",
];

export const EXCEL_MULTI_DATASETS: ExcelDataset[] = [
  "FAIR_EXHIBITORS_LIST",
  "FAIR_STALLS_LIST",
  "FAIR_PURCHASES_LIST",
  "OWNER_FAIRS_LIST",
  "OWNER_STALLS_LIST",
  "STALL_FAIRS_LIST",
];

/**
 * Deriva o "modo" da aba com base no dataset.
 * Importante: o backend NÃO conhece "mode".
 */
export function excelDatasetMode(dataset: ExcelDataset): ExcelSheetMode {
  return EXCEL_MULTI_DATASETS.includes(dataset) ? "MULTI" : "SINGLE";
}

/** =========================
 * DATASETS (catálogo)
 * ========================= */

export const ExcelScopeParamTypeSchema = z.enum(["UUID", "CUID"]);
export type ExcelScopeParamType = z.infer<typeof ExcelScopeParamTypeSchema>;

export const ExcelDatasetScopeParamSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: ExcelScopeParamTypeSchema,
  required: z.boolean(),
  hint: z.string().optional(),
});
export type ExcelDatasetScopeParam = z.infer<
  typeof ExcelDatasetScopeParamSchema
>;

export const ExcelDatasetItemSchema = z.object({
  dataset: ExcelDatasetSchema,
  label: z.string(),
  scope: z.array(ExcelDatasetScopeParamSchema).default([]),
  description: z.string().optional(),
});
export type ExcelDatasetItem = z.infer<typeof ExcelDatasetItemSchema>;

export const ExcelDatasetsResponseSchema = z.array(ExcelDatasetItemSchema);
export type ExcelDatasetsResponse = z.infer<typeof ExcelDatasetsResponseSchema>;

export const ExcelDatasetFieldSchema = z.object({
  fieldKey: z.string(),
  label: z.string(),
  format: ExcelValueFormatSchema.optional(),
  group: z.string().optional(),
  hint: z.string().optional(),
  description: z.string().optional(),
});
export type ExcelDatasetField = z.infer<typeof ExcelDatasetFieldSchema>;

export const ExcelDatasetFieldsResponseSchema = z.array(
  ExcelDatasetFieldSchema,
);
export type ExcelDatasetFieldsResponse = z.infer<
  typeof ExcelDatasetFieldsResponseSchema
>;

/** =========================
 * TEMPLATE: BACKEND SHAPES
 * ========================= */

export const ExcelTemplateCellSchema = z.object({
  id: z.string().optional(),
  row: z.number().int().positive(),
  col: z.number().int().positive(),
  type: ExcelCellTypeSchema,
  value: z.string(),
  format: ExcelValueFormatSchema.nullable().optional(),
  bold: z.boolean().optional(),
});
export type ExcelTemplateCell = z.infer<typeof ExcelTemplateCellSchema>;

export const ExcelTemplateTableColumnSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().nonnegative(),
  header: z.string(),
  fieldKey: z.string(),
  format: ExcelValueFormatSchema.nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
});
export type ExcelTemplateTableColumn = z.infer<
  typeof ExcelTemplateTableColumnSchema
>;

export const ExcelTemplateTableSchema = z.object({
  id: z.string().optional(),
  anchorRow: z.number().int().positive(),
  anchorCol: z.number().int().positive(),
  dataset: ExcelDatasetSchema,
  includeHeader: z.boolean().optional().default(true),
  columns: z.array(ExcelTemplateTableColumnSchema).default([]),
});
export type ExcelTemplateTable = z.infer<typeof ExcelTemplateTableSchema>;

export const ExcelTemplateSheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int().nonnegative(),
  dataset: ExcelDatasetSchema,
  cells: z.array(ExcelTemplateCellSchema).default([]),
  tables: z.array(ExcelTemplateTableSchema).default([]),
});
export type ExcelTemplateSheet = z.infer<typeof ExcelTemplateSheetSchema>;

export const ExcelTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ExcelTemplateStatusSchema,
  scope: ExcelTemplateScopeSchema,
  sheets: z.array(ExcelTemplateSheetSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExcelTemplate = z.infer<typeof ExcelTemplateSchema>;

export const ExcelTemplateListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ExcelTemplateStatusSchema,
  scope: ExcelTemplateScopeSchema,
  updatedAt: z.string(),
  createdAt: z.string().optional(),
});
export type ExcelTemplateListItem = z.infer<typeof ExcelTemplateListItemSchema>;

export const ExcelTemplatesListResponseSchema = z.array(
  ExcelTemplateListItemSchema,
);
export type ExcelTemplatesListResponse = z.infer<
  typeof ExcelTemplatesListResponseSchema
>;

/** =========================
 * TEMPLATE: UI-only shapes
 * ========================= */

export const ExcelTemplateMultiColumnInputSchema = z.object({
  id: z.string().min(1),
  header: z.string().optional().default(""),
  fieldKey: z.string().optional().default(""),
  format: ExcelValueFormatSchema.optional(),
});
export type ExcelTemplateMultiColumnInput = z.infer<
  typeof ExcelTemplateMultiColumnInputSchema
>;

export const ExcelTemplateSheetUiSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
  dataset: ExcelDatasetSchema,

  // UI-only:
  mode: ExcelSheetModeSchema.optional(),
  gridRows: z.number().int().positive().optional(),
  gridCols: z.number().int().positive().optional(),
  multiColumns: z.array(ExcelTemplateMultiColumnInputSchema).optional(),

  // backend-supported:
  cells: z
    .array(
      z.object({
        row: z.number().int().positive(),
        col: z.number().int().positive(),
        type: ExcelCellTypeSchema,
        value: z.string(),
        format: ExcelValueFormatSchema.nullable().optional(),
        bold: z.boolean().optional(),
      }),
    )
    .optional(),
  tables: z
    .array(
      z.object({
        anchorRow: z.number().int().positive(),
        anchorCol: z.number().int().positive(),
        dataset: ExcelDatasetSchema,
        includeHeader: z.boolean().optional(),
        columns: z
          .array(
            z.object({
              order: z.number().int().nonnegative(),
              header: z.string(),
              fieldKey: z.string(),
              format: ExcelValueFormatSchema.nullable().optional(),
              width: z.number().int().positive().nullable().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
export type ExcelTemplateSheetInput = z.infer<
  typeof ExcelTemplateSheetUiSchema
>;

/** =========================
 * API INPUTS (somente backend aceita)
 * ========================= */

export const ExcelTemplateCellInputSchema = z.object({
  row: z.number().int().positive(),
  col: z.number().int().positive(),
  type: ExcelCellTypeSchema,
  value: z.string(),
  format: ExcelValueFormatSchema.nullable().optional(),
  bold: z.boolean().optional(),
});
export type ExcelTemplateCellInput = z.infer<
  typeof ExcelTemplateCellInputSchema
>;

export const ExcelTemplateTableColumnInputSchema = z.object({
  order: z.number().int().nonnegative(),
  header: z.string().min(1),
  fieldKey: z.string().min(1),
  format: ExcelValueFormatSchema.nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
});
export type ExcelTemplateTableColumnInput = z.infer<
  typeof ExcelTemplateTableColumnInputSchema
>;

export const ExcelTemplateTableInputSchema = z.object({
  anchorRow: z.number().int().positive(),
  anchorCol: z.number().int().positive(),
  dataset: ExcelDatasetSchema,
  includeHeader: z.boolean().optional(),
  columns: z.array(ExcelTemplateTableColumnInputSchema).default([]),
});
export type ExcelTemplateTableInput = z.infer<
  typeof ExcelTemplateTableInputSchema
>;

export const ExcelTemplateSheetApiInputSchema = z
  .object({
    name: z.string().min(1),
    order: z.number().int().nonnegative().optional(),
    dataset: ExcelDatasetSchema,
    cells: z.array(ExcelTemplateCellInputSchema).optional(),
    tables: z.array(ExcelTemplateTableInputSchema).optional(),
  })
  .strip();
export type ExcelTemplateSheetApiInput = z.infer<
  typeof ExcelTemplateSheetApiInputSchema
>;

export const CreateExcelTemplateInputSchema = z.object({
  name: z.string().min(1),
  status: ExcelTemplateStatusSchema.optional(),
  scope: ExcelTemplateScopeSchema.optional(),
  sheets: z.array(ExcelTemplateSheetApiInputSchema).min(1),
});
export type CreateExcelTemplateInput = z.infer<
  typeof CreateExcelTemplateInputSchema
>;

export const UpdateExcelTemplateInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    status: ExcelTemplateStatusSchema.optional(),
    scope: ExcelTemplateScopeSchema.optional(),
    sheets: z.array(ExcelTemplateSheetApiInputSchema).optional(),
  })
  .strip();
export type UpdateExcelTemplateInput = z.infer<
  typeof UpdateExcelTemplateInputSchema
>;

export const CreateExcelExportInputSchema = z.object({
  /**
   * Template selecionado para gerar o arquivo.
   */
  templateId: z.string().min(1),

  /**
   * Escopo do export (o backend espera tudo dentro de "scope").
   * MVP atual: scope.fairId obrigatório (pode evoluir depois).
   */
  scope: z
    .object({
      fairId: z.string().min(1).optional(),
      ownerId: z.string().min(1).optional(),
      stallId: z.string().min(1).optional(),
    })
    .default({}),
});
export type CreateExcelExportInput = z.infer<
  typeof CreateExcelExportInputSchema
>;

/** =========================
 * ✅ EXPORT REQUIREMENTS (dinâmico)
 * ========================= */

export const ExcelScopeParamKeySchema = z.enum([
  "fairId",
  "ownerId",
  "stallId",
]);
export type ExcelScopeParamKey = z.infer<typeof ExcelScopeParamKeySchema>;

export const ExcelExportRequirementParamSchema = z
  .object({
    key: ExcelScopeParamKeySchema,
    label: z.string().min(1),
    type: ExcelScopeParamTypeSchema, // UUID | CUID
    required: z.boolean(),
    hint: z.string().optional(),
  })
  // ✅ backend pode incluir campos extras (ex.: requiredByDatasets)
  .passthrough();
export type ExcelExportRequirementParam = z.infer<
  typeof ExcelExportRequirementParamSchema
>;

export const ExcelExportOptionItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sublabel: z.string().optional(),
  disabled: z.boolean().optional(),
});
export type ExcelExportOptionItem = z.infer<typeof ExcelExportOptionItemSchema>;

/**
 * ✅ Backend atual retorna:
 * {
 *   params: [{ key:"fairId"... }, { key:"ownerId"... }],
 *   options: { fairId: [...], ownerId: [...] }
 * }
 *
 * Então aqui aceitamos "options" por chave (fairId/ownerId/stallId),
 * sem exigir "fairs/owners/stalls".
 */
export const ExcelExportRequirementsResponseSchema = z.object({
  templateId: z.string().min(1).optional(),
  params: z.array(ExcelExportRequirementParamSchema).default([]),

  // ✅ Zod v4: record precisa de (keyType, valueType)
  options: z
    .record(z.string(), z.array(ExcelExportOptionItemSchema))
    .default({}),
});
export type ExcelExportRequirementsResponse = z.infer<
  typeof ExcelExportRequirementsResponseSchema
>;

/** =========================
 * Labels helpers
 * ========================= */

export function excelDatasetLabel(dataset: ExcelDataset) {
  switch (dataset) {
    case "FAIR_INFO":
      return "Feira • Informações";
    case "FAIR_SUMMARY":
      return "Feira • Resumo";
    case "OWNER_INFO":
      return "Expositor • Informações";
    case "OWNER_SUMMARY":
      return "Expositor • Resumo";
    case "STALL_INFO":
      return "Barraca • Informações";
    case "STALL_SUMMARY":
      return "Barraca • Resumo";
    case "FAIR_EXHIBITORS_LIST":
      return "Feira • Lista de expositores";
    case "FAIR_STALLS_LIST":
      return "Feira • Lista de barracas";
    case "FAIR_PURCHASES_LIST":
      return "Feira • Lista de compras";
    case "OWNER_FAIRS_LIST":
      return "Expositor • Lista de feiras";
    case "OWNER_STALLS_LIST":
      return "Expositor • Lista de barracas";
    case "STALL_FAIRS_LIST":
      return "Barraca • Lista de feiras";
    default:
      return dataset;
  }
}

export function excelScopeLabel(scope: ExcelTemplateScope) {
  switch (scope) {
    case "FAIR":
      return "Feira";
    case "FAIR_OWNER":
      return "Feira + Expositor";
    case "FAIR_STALL":
      return "Feira + Barraca";
    case "OWNER":
      return "Expositor";
    case "STALL":
      return "Barraca";
    default:
      return scope;
  }
}
