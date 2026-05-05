import { api } from "@/app/shared/http/api";
import {
  ExhibitorPayoutImportConfigSchema,
  ExhibitorPayoutsImportPreviewSchema,
  ExhibitorPayoutsResponseSchema,
  type ExhibitorPayoutImportConfig,
  type ExhibitorPayoutsImportPreview,
  type ExhibitorPayoutsResponse,
} from "./exhibitor-payouts.schema";

export async function listExhibitorPayouts(fairId: string): Promise<ExhibitorPayoutsResponse> {
  const data = await api.get<unknown>(`fairs/${fairId}/exhibitor-payouts`, undefined, {
    cache: "no-store",
  });

  const normalized = Array.isArray(data) ? { items: data } : data;
  return ExhibitorPayoutsResponseSchema.parse(normalized);
}

export async function getExhibitorPayoutImportConfig(
  fairId: string,
): Promise<ExhibitorPayoutImportConfig> {
  const data = await api.get<unknown>(`fairs/${fairId}/exhibitor-payouts/import-config`, undefined, {
    cache: "no-store",
  });

  return ExhibitorPayoutImportConfigSchema.parse(data);
}

export async function updateExhibitorPayoutImportConfig(
  fairId: string,
  payload: { spreadsheetId: string; sheetName: string; headerRow: number; dataStartRow: number },
): Promise<ExhibitorPayoutImportConfig> {
  const data = await api.patch<unknown>(`fairs/${fairId}/exhibitor-payouts/import-config`, payload);
  return ExhibitorPayoutImportConfigSchema.parse(data);
}

export async function previewExhibitorPayoutsImport(
  fairId: string,
): Promise<ExhibitorPayoutsImportPreview> {
  const data = await api.post<unknown>(`fairs/${fairId}/exhibitor-payouts/import/preview`);
  return ExhibitorPayoutsImportPreviewSchema.parse(data);
}

export async function confirmExhibitorPayoutsImport(
  fairId: string,
  payload: { importValidRowsOnly?: boolean; rows?: number[] } = { importValidRowsOnly: true },
): Promise<ExhibitorPayoutsImportPreview | ExhibitorPayoutsResponse> {
  const data = await api.post<unknown>(`fairs/${fairId}/exhibitor-payouts/import/confirm`, payload);

  const previewResult = ExhibitorPayoutsImportPreviewSchema.safeParse(data);
  if (previewResult.success) return previewResult.data;

  const normalized = Array.isArray(data) ? { items: data } : data;
  return ExhibitorPayoutsResponseSchema.parse(normalized);
}
