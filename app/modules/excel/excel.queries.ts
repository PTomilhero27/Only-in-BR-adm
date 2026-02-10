// src/modules/excel/excel.queries.ts
/**
 * Excel Queries (TanStack Query)
 * Responsabilidade:
 * - Padronizar queryKeys
 * - Centralizar hooks de leitura/mutations
 * - Controlar invalidações para manter UI consistente
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listExcelDatasets,
  listExcelDatasetFields,

  listExcelTemplates,
  getExcelTemplate,
  createExcelTemplate,
  updateExcelTemplate,
  deleteExcelTemplate,

  createExcelExport,
} from "./excel.service"

import type {
  ExcelDataset,
  CreateExcelTemplateInput,
  UpdateExcelTemplateInput,
  CreateExcelExportInput,
} from "./excel.schema"

export const excelQueryKeys = {
  all: ["excel"] as const,

  datasets: () => ["excel", "datasets"] as const,
  datasetFields: (dataset: ExcelDataset) => ["excel", "datasets", "fields", { dataset }] as const,

  templates: () => ["excel", "templates"] as const,
  template: (templateId: string) => ["excel", "templates", "detail", { templateId }] as const,
}

/** =========================
 * DATASETS
 * ========================= */

/**
 * GET /excel/datasets
 */
export function useExcelDatasetsQuery() {
  return useQuery({
    queryKey: excelQueryKeys.datasets(),
    queryFn: () => listExcelDatasets(),
  })
}

/**
 * GET /excel/datasets/:dataset/fields
 */
export function useExcelDatasetFieldsQuery(dataset: ExcelDataset | undefined) {
  return useQuery({
    queryKey: dataset ? excelQueryKeys.datasetFields(dataset) : ["excel", "datasets", "fields", "disabled"],
    queryFn: () => listExcelDatasetFields(dataset!),
    enabled: !!dataset,
  })
}

/** =========================
 * TEMPLATES
 * ========================= */

/**
 * GET /excel-templates
 */
export function useExcelTemplatesQuery() {
  return useQuery({
    queryKey: excelQueryKeys.templates(),
    queryFn: () => listExcelTemplates(),
  })
}

/**
 * GET /excel-templates/:id
 */
export function useExcelTemplateQuery(templateId: string | undefined) {
  return useQuery({
    queryKey: templateId ? excelQueryKeys.template(templateId) : ["excel", "templates", "detail", "disabled"],
    queryFn: () => getExcelTemplate(templateId!),
    enabled: !!templateId,
  })
}

/**
 * POST /excel-templates
 */
export function useCreateExcelTemplateMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateExcelTemplateInput) => createExcelTemplate(input),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: excelQueryKeys.templates() })
    },
  })
}

/**
 * PATCH /excel-templates/:id
 */
export function useUpdateExcelTemplateMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { templateId: string; input: UpdateExcelTemplateInput }) =>
      updateExcelTemplate({ templateId: vars.templateId, input: vars.input }),

    onSettled: async (_data, _err, vars) => {
      await qc.invalidateQueries({ queryKey: excelQueryKeys.templates() })
      await qc.invalidateQueries({ queryKey: excelQueryKeys.template(vars.templateId) })
    },
  })
}

/**
 * DELETE /excel-templates/:id
 */
export function useDeleteExcelTemplateMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteExcelTemplate(templateId),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: excelQueryKeys.templates() })
    },
  })
}

/** =========================
 * EXPORTS
 * ========================= */

/**
 * POST /excel-exports
 * Retorna Blob (.xlsx)
 *
 * Observação:
 * - Não invalidamos nada aqui (export é efeito colateral de download).
 * - A UI decide como baixar (URL.createObjectURL + <a download>).
 */
export function useCreateExcelExportMutation() {
  return useMutation({
    mutationFn: (input: CreateExcelExportInput) => createExcelExport(input),
  })
}
