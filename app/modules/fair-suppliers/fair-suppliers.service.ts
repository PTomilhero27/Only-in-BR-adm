import { api } from "@/app/shared/http/api";
import { z } from "zod";
import {
  FairSupplierSchema,
  FairSuppliersImportPreviewSchema,
  FairSuppliersResponseSchema,
  UpsertFairSupplierPayloadSchema,
  FairSupplierImportConfigSchema,
  type FairSupplier,
  type FairSuppliersImportPreview,
  type FairSuppliersResponse,
  type UpsertFairSupplierPayload,
  type FairSupplierImportConfig,
} from "./fair-suppliers.schema";

const DeleteFairSuppliersResponseSchema = z.object({
  status: z.literal("DELETED"),
  deletedSuppliers: z.number(),
  deletedInstallments: z.number(),
  deletedRemittanceItems: z.number(),
  deletedRemittances: z.number(),
  updatedRemittances: z.number(),
});

export type DeleteFairSuppliersResponse = z.infer<typeof DeleteFairSuppliersResponseSchema>;

/**
 * Service dos fornecedores da feira.
 * Mantem os nomes de endpoint alinhados ao backend financeiro:
 * fornecedores preparam os itens pagaveis, mas a remessa PIX e gerada em outra tela.
 */

export async function listFairSuppliers(fairId: string): Promise<FairSuppliersResponse> {
  const data = await api.get<unknown>(`fairs/${fairId}/suppliers`, undefined, {
    cache: "no-store",
  });

  const normalized = Array.isArray(data) ? { items: data } : data;
  return FairSuppliersResponseSchema.parse(normalized);
}

export async function getFairSupplierImportConfig(fairId: string): Promise<FairSupplierImportConfig> {
  const data = await api.get<unknown>(`fairs/${fairId}/suppliers/import-config`, undefined, {
    cache: "no-store",
  });
  return FairSupplierImportConfigSchema.parse(data);
}

export async function updateFairSupplierImportConfig(
  fairId: string,
  payload: { spreadsheetId: string; sheetName: string; headerRow: number; dataStartRow: number },
): Promise<FairSupplierImportConfig> {
  const data = await api.patch<unknown>(`fairs/${fairId}/suppliers/import-config`, payload);
  return FairSupplierImportConfigSchema.parse(data);
}

export async function previewFairSuppliersImport(
  fairId: string,
): Promise<FairSuppliersImportPreview> {
  const data = await api.post<unknown>(`fairs/${fairId}/suppliers/import/preview`);
  return FairSuppliersImportPreviewSchema.parse(data);
}

export async function confirmFairSuppliersImport(
  fairId: string,
  payload: { importValidRowsOnly?: boolean; rows?: number[] } = { importValidRowsOnly: true },
): Promise<FairSuppliersImportPreview | FairSuppliersResponse> {
  const data = await api.post<unknown>(`fairs/${fairId}/suppliers/import/confirm`, payload);

  const previewResult = FairSuppliersImportPreviewSchema.safeParse(data);
  if (previewResult.success) return previewResult.data;

  const normalized = Array.isArray(data) ? { items: data } : data;
  return FairSuppliersResponseSchema.parse(normalized);
}

export async function createFairSupplier(
  fairId: string,
  payload: UpsertFairSupplierPayload,
): Promise<FairSupplier> {
  const input = UpsertFairSupplierPayloadSchema.parse(payload);
  const data = await api.post<unknown>(`fairs/${fairId}/suppliers`, input);
  return FairSupplierSchema.parse(data);
}

export async function updateFairSupplier(params: {
  fairId: string;
  supplierId: string;
  payload: UpsertFairSupplierPayload;
}): Promise<FairSupplier> {
  const input = UpsertFairSupplierPayloadSchema.parse(params.payload);
  const data = await api.patch<unknown>(
    `fairs/${params.fairId}/suppliers/${params.supplierId}`,
    input,
  );
  return FairSupplierSchema.parse(data);
}

export async function deleteFairSupplier(params: {
  fairId: string;
  supplierId: string;
}): Promise<{ ok: true }> {
  await api.delete(`fairs/${params.fairId}/suppliers/${params.supplierId}`);
  return { ok: true };
}

export async function deleteFairSuppliers(params: {
  fairId: string;
}): Promise<DeleteFairSuppliersResponse> {
  const data = await api.delete<unknown>(`fairs/${params.fairId}/suppliers`);
  return DeleteFairSuppliersResponseSchema.parse(data);
}
