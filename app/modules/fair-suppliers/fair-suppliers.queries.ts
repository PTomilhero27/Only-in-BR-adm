"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmFairSuppliersImport,
  createFairSupplier,
  deleteFairSupplier,
  deleteFairSuppliers,
  listFairSuppliers,
  previewFairSuppliersImport,
  updateFairSupplier,
  getFairSupplierImportConfig,
  updateFairSupplierImportConfig,
} from "./fair-suppliers.service";
import type { UpsertFairSupplierPayload } from "./fair-suppliers.schema";

export const fairSuppliersQueryKeys = {
  all: ["fairs", "suppliers"] as const,
  list: (fairId: string) => ["fairs", "suppliers", "list", { fairId }] as const,
  preview: (fairId: string) => ["fairs", "suppliers", "import-preview", { fairId }] as const,
  importConfig: (fairId: string) => ["fairs", "suppliers", "import-config", { fairId }] as const,
};

async function invalidateSupplierSideEffects(qc: ReturnType<typeof useQueryClient>, fairId: string) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: fairSuppliersQueryKeys.list(fairId) }),
    qc.invalidateQueries({ queryKey: ["fairs", "payable-items", { fairId }] }),
    qc.invalidateQueries({ queryKey: ["payable-items", { fairId }] }),
    qc.invalidateQueries({ queryKey: ["fairs", "pix-remittances", "list", { fairId }] }),
    qc.invalidateQueries({ queryKey: ["fairs", "financial-summary", { fairId }] }),
    qc.invalidateQueries({ queryKey: ["fairs", "financeiro", { fairId }] }),
  ]);
}

export function useFairSuppliersQuery(fairId: string) {
  return useQuery({
    queryKey: fairSuppliersQueryKeys.list(fairId),
    queryFn: () => listFairSuppliers(fairId),
    enabled: !!fairId,
  });
}

export function useFairSupplierImportConfigQuery(fairId: string) {
  return useQuery({
    queryKey: fairSuppliersQueryKeys.importConfig(fairId),
    queryFn: () => getFairSupplierImportConfig(fairId),
    enabled: !!fairId,
  });
}

export function useUpdateFairSupplierImportConfigMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { spreadsheetId: string; sheetName: string; headerRow: number; dataStartRow: number }) =>
      updateFairSupplierImportConfig(fairId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fairSuppliersQueryKeys.importConfig(fairId) });
    },
  });
}

export function usePreviewFairSuppliersImportMutation(fairId: string) {
  return useMutation({
    mutationFn: () => previewFairSuppliersImport(fairId),
  });
}

export function useConfirmFairSuppliersImportMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { importValidRowsOnly?: boolean; rows?: number[] }) =>
      confirmFairSuppliersImport(fairId, payload),
    onSuccess: async () => {
      await invalidateSupplierSideEffects(qc, fairId);
    },
  });
}

export function useCreateFairSupplierMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertFairSupplierPayload) => createFairSupplier(fairId, payload),
    onSuccess: async () => {
      await invalidateSupplierSideEffects(qc, fairId);
    },
  });
}

export function useUpdateFairSupplierMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { supplierId: string; payload: UpsertFairSupplierPayload }) =>
      updateFairSupplier({ fairId, supplierId: vars.supplierId, payload: vars.payload }),
    onSuccess: async () => {
      await invalidateSupplierSideEffects(qc, fairId);
    },
  });
}

export function useDeleteFairSupplierMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (supplierId: string) => deleteFairSupplier({ fairId, supplierId }),
    onSuccess: async () => {
      await invalidateSupplierSideEffects(qc, fairId);
    },
  });
}

export function useDeleteFairSuppliersMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => deleteFairSuppliers({ fairId }),
    onSettled: async () => {
      await invalidateSupplierSideEffects(qc, fairId);
    },
  });
}
