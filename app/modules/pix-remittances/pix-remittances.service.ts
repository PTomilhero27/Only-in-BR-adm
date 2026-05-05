import { api } from "@/app/shared/http/api";
import {
  CreatePixRemittancePayload,
  CreatePixRemittanceResponse,
  PixRemittanceListItem,
  RedoPixRemittancePayload,
} from "./types";

/**
 * Este service encapsula as chamadas da API relacionadas à geração de remessas PIX.
 */

/**
 * Cria uma remessa PIX no backend a partir dos fornecedores selecionados.
 * Chama: POST /fairs/:fairId/pix-remittances
 */
export async function createPixRemittance({
  fairId,
  mode,
  items,
}: CreatePixRemittancePayload): Promise<CreatePixRemittanceResponse> {
  return api.post<CreatePixRemittanceResponse>(
    `fairs/${fairId}/pix-remittances`,
    { mode, items },
  );
}

/**
 * Cancela uma remessa gerada e cria uma nova com o mesmo contrato de payload.
 * Chama: POST /fairs/:fairId/pix-remittances/:remittanceId/redo
 */
export async function redoPixRemittance({
  fairId,
  remittanceId,
  mode,
  items,
}: RedoPixRemittancePayload): Promise<CreatePixRemittanceResponse> {
  return api.post<CreatePixRemittanceResponse>(
    `fairs/${fairId}/pix-remittances/${remittanceId}/redo`,
    { mode, items },
  );
}

function normalizeRemittanceItem(raw: unknown): PixRemittanceListItem["items"][number] | null {
  const item = raw as any;
  const supplierInstallmentId =
    item?.supplierInstallmentId ??
    item?.installmentId ??
    item?.payableItemId ??
    item?.supplierInstallment?.id ??
    item?.installment?.id ??
    null;

  if (!supplierInstallmentId) return null;

  return {
    supplierInstallmentId,
    amountCents: item?.amountCents ?? item?.amount ?? null,
    group: item?.group ?? item?.groupNumber ?? null,
    payeeType: item?.payeeType ?? "SUPPLIER",
  };
}

function isNormalizedRemittanceItem(
  item: PixRemittanceListItem["items"][number] | null,
): item is PixRemittanceListItem["items"][number] {
  return item !== null;
}

function normalizePixRemittance(raw: unknown): PixRemittanceListItem | null {
  const remittance = raw as any;
  if (!remittance?.id) return null;

  const rawItems =
    remittance.items ??
    remittance.payableItems ??
    remittance.installments ??
    remittance.remittanceItems ??
    remittance.entries ??
    [];

  return {
    id: remittance.id,
    number: remittance.number ?? remittance.remittanceNumber ?? null,
    name: remittance.name ?? null,
    fileName: remittance.fileName ?? null,
    status: remittance.status ?? null,
    mode: remittance.mode ?? null,
    items: Array.isArray(rawItems)
      ? rawItems.map(normalizeRemittanceItem).filter(isNormalizedRemittanceItem)
      : [],
  };
}

function isPixRemittanceListItem(item: PixRemittanceListItem | null): item is PixRemittanceListItem {
  return item !== null;
}

export async function listPixRemittances(fairId: string): Promise<PixRemittanceListItem[]> {
  const data = await api.get<unknown>(`fairs/${fairId}/pix-remittances`, undefined, {
    cache: "no-store",
  });
  const rawItems = Array.isArray(data) ? data : (data as any)?.items ?? (data as any)?.remittances ?? [];
  return Array.isArray(rawItems)
    ? rawItems.map(normalizePixRemittance).filter(isPixRemittanceListItem)
    : [];
}

/**
 * Baixa o arquivo de uma remessa PIX já criada.
 * Chama: GET /fairs/:fairId/pix-remittances/:remittanceId/download
 * Retorna um Blob com o conteúdo do arquivo .txt para download.
 */
export async function downloadPixRemittance(
  fairId: string,
  remittanceId: string,
): Promise<Blob> {
  return api.get<Blob>(
    `fairs/${fairId}/pix-remittances/${remittanceId}/download`,
    undefined,
    { responseType: "blob" },
  );
}
