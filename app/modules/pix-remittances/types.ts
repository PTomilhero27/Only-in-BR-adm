/**
 * Tipagens relacionadas à geração de remessas PIX a partir dos fornecedores.
 */

export type PixRemittanceMode = "SINGLE" | "SPLIT_TWO";
export type PixRemittancePayeeType = "SUPPLIER" | "EXHIBITOR";
export type PixRemittanceStatus = "GENERATED" | "PAID" | "CANCELLED";

export interface RemittanceItemPayload {
  payeeType: PixRemittancePayeeType;
  supplierInstallmentId: string;
  amountCents: number;
  group?: number; // 1 ou 2, usado quando mode = "SPLIT_TWO"
}

export interface CreatePixRemittancePayload {
  fairId: string;
  mode: PixRemittanceMode;
  items: RemittanceItemPayload[];
}

export interface RedoPixRemittancePayload extends CreatePixRemittancePayload {
  remittanceId: string;
}

export interface CreatedPixRemittance {
  id: string;
  name: string;
  fileName: string;
  groupNumber: number;
  totalItems: number;
  totalAmountCents: number;
  downloadUrl: string;
}

export interface CreatePixRemittanceResponse {
  createdRemittances: CreatedPixRemittance[];
}

export interface PixRemittanceListItem {
  id: string;
  number?: string | null;
  name?: string | null;
  fileName?: string | null;
  status?: PixRemittanceStatus | string | null;
  mode?: PixRemittanceMode | string | null;
  items: Array<{
    supplierInstallmentId?: string | null;
    amountCents?: number | null;
    group?: number | null;
    payeeType?: PixRemittancePayeeType | string | null;
  }>;
}
