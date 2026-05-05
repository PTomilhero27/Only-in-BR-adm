"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fairExhibitorsQueryKeys } from "../fairs/exhibitors/exhibitors.queries";
import {
  confirmExhibitorPayoutsImport,
  getExhibitorPayoutImportConfig,
  listExhibitorPayouts,
  previewExhibitorPayoutsImport,
  updateExhibitorPayoutImportConfig,
} from "./exhibitor-payouts.service";

export const exhibitorPayoutsQueryKeys = {
  all: ["fairs", "exhibitor-payouts"] as const,
  list: (fairId: string) => ["fairs", "exhibitor-payouts", "list", { fairId }] as const,
  preview: (fairId: string) => ["fairs", "exhibitor-payouts", "import-preview", { fairId }] as const,
  importConfig: (fairId: string) => ["fairs", "exhibitor-payouts", "import-config", { fairId }] as const,
};

async function invalidatePayoutSideEffects(qc: ReturnType<typeof useQueryClient>, fairId: string) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: exhibitorPayoutsQueryKeys.list(fairId) }),
    qc.invalidateQueries({ queryKey: fairExhibitorsQueryKeys.list(fairId) }),
    qc.invalidateQueries({ queryKey: ["fairs", "financial-summary", { fairId }] }),
    qc.invalidateQueries({ queryKey: ["fairs", "financeiro", { fairId }] }),
  ]);
}

export function useExhibitorPayoutsQuery(fairId: string) {
  return useQuery({
    queryKey: exhibitorPayoutsQueryKeys.list(fairId),
    queryFn: () => listExhibitorPayouts(fairId),
    enabled: !!fairId,
  });
}

export function useExhibitorPayoutImportConfigQuery(fairId: string) {
  return useQuery({
    queryKey: exhibitorPayoutsQueryKeys.importConfig(fairId),
    queryFn: () => getExhibitorPayoutImportConfig(fairId),
    enabled: !!fairId,
  });
}

export function useUpdateExhibitorPayoutImportConfigMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { spreadsheetId: string; sheetName: string; headerRow: number; dataStartRow: number }) =>
      updateExhibitorPayoutImportConfig(fairId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exhibitorPayoutsQueryKeys.importConfig(fairId) });
    },
  });
}

export function usePreviewExhibitorPayoutsImportMutation(fairId: string) {
  return useMutation({
    mutationFn: () => previewExhibitorPayoutsImport(fairId),
  });
}

export function useConfirmExhibitorPayoutsImportMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { importValidRowsOnly?: boolean; rows?: number[] }) =>
      confirmExhibitorPayoutsImport(fairId, payload),
    onSuccess: async () => {
      await invalidatePayoutSideEffects(qc, fairId);
    },
  });
}
