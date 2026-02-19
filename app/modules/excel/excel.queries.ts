/**
 * Excel Queries (TanStack Query)
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listExcelDatasets,
  listExcelDatasetFields,
  listExcelTemplates,
  getExcelTemplate,
  createExcelTemplate,
  updateExcelTemplate,
  deleteExcelTemplate,
  createExcelExport,
  getExcelExportRequirements,
} from "./excel.service";

import type {
  ExcelDataset,
  CreateExcelTemplateInput,
  UpdateExcelTemplateInput,
  CreateExcelExportInput,
} from "./excel.schema";

export const excelQueryKeys = {
  all: ["excel"] as const,

  datasets: () => ["excel", "datasets"] as const,
  datasetFields: (dataset: ExcelDataset) =>
    ["excel", "datasets", "fields", { dataset }] as const,

  templates: () => ["excel", "templates"] as const,
  template: (templateId: string) =>
    ["excel", "templates", "detail", { templateId }] as const,

  // ✅ novo
  exportRequirements: (templateId: string) =>
    ["excel", "exports", "requirements", { templateId }] as const,
};

/** =========================
 * DATASETS
 * ========================= */

export function useExcelDatasetsQuery() {
  return useQuery({
    queryKey: excelQueryKeys.datasets(),
    queryFn: () => listExcelDatasets(),
  });
}

export function useExcelDatasetFieldsQuery(dataset: ExcelDataset | undefined) {
  return useQuery({
    queryKey: dataset
      ? excelQueryKeys.datasetFields(dataset)
      : ["excel", "datasets", "fields", "disabled"],
    queryFn: () => listExcelDatasetFields(dataset!),
    enabled: !!dataset,
  });
}

/** =========================
 * ✅ EXPORT REQUIREMENTS
 * ========================= */

export function useExcelExportRequirementsQuery(
  templateId: string | undefined,
) {
  return useQuery({
    queryKey: templateId
      ? excelQueryKeys.exportRequirements(templateId)
      : ["excel", "exports", "requirements", "disabled"],
    queryFn: () => getExcelExportRequirements(templateId!),
    enabled: !!templateId,
  });
}

/** =========================
 * TEMPLATES
 * ========================= */

export function useExcelTemplatesQuery() {
  return useQuery({
    queryKey: excelQueryKeys.templates(),
    queryFn: () => listExcelTemplates(),
  });
}

export function useExcelTemplateQuery(templateId: string | undefined) {
  return useQuery({
    queryKey: templateId
      ? excelQueryKeys.template(templateId)
      : ["excel", "templates", "detail", "disabled"],
    queryFn: () => getExcelTemplate(templateId!),
    enabled: !!templateId,
  });
}

export function useCreateExcelTemplateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExcelTemplateInput) => createExcelTemplate(input),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: excelQueryKeys.templates() });
    },
  });
}

export function useUpdateExcelTemplateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      templateId: string;
      input: UpdateExcelTemplateInput;
    }) =>
      updateExcelTemplate({ templateId: vars.templateId, input: vars.input }),

    onSettled: async (_data, _err, vars) => {
      await qc.invalidateQueries({ queryKey: excelQueryKeys.templates() });
      await qc.invalidateQueries({
        queryKey: excelQueryKeys.template(vars.templateId),
      });

      // ✅ se o template mudou, requirements pode mudar também
      await qc.invalidateQueries({
        queryKey: excelQueryKeys.exportRequirements(vars.templateId),
      });
    },
  });
}

export function useDeleteExcelTemplateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteExcelTemplate(templateId),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: excelQueryKeys.templates() });
    },
  });
}

/** =========================
 * EXPORTS
 * ========================= */

export function useCreateExcelExportMutation() {
  return useMutation({
    mutationFn: (input: CreateExcelExportInput) => createExcelExport(input),
  });
}
