export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export type PixKeyConfidence = "HIGH" | "MEDIUM" | "LOW";

export type FairSupplierStatus =
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export type FairSupplierInstallmentStatus =
  | "PENDING"
  | "INCLUDED_IN_REMITTANCE"
  | "PAID"
  | "CANCELLED";

export type ImportRowAction = "CREATE" | "UPDATE" | "SKIP" | "ERROR";

export type ImportRowStatus = "VALID" | "INVALID" | "WARNING";

export type ImportedSpreadsheetStatus = "PAGO" | "NAO_PAGO" | "NÃO PAGO";

export type FairSupplierInstallment = {
  id?: string;
  number: number;
  label?: string;
  paymentMoment?: "PRE_EVENT" | "POST_EVENT";
  amountCents: number;
  status?: FairSupplierInstallmentStatus;
  paidAt?: string | null;
  paidAmountCents?: number | null;
};

export type FairSupplier = {
  id: string;
  fairId: string;
  name: string;
  holderName?: string | null;
  holderDocument?: string | null;
  serviceDescription?: string | null;
  pixKey?: string | null;
  pixKeyType?: PixKeyType | null;
  pixKeyConfidence?: PixKeyConfidence | null;
  totalAmountCents: number;
  paidAmountCents: number;
  pendingAmountCents: number;
  status: FairSupplierStatus;
  notes?: string | null;
  installments: FairSupplierInstallment[];
};

export type ImportSupplierPreviewRow = {
  rowNumber: number;
  action: ImportRowAction;
  status: ImportRowStatus;
  supplier?: {
    name: string;
    holderName?: string | null;
    holderDocument?: string | null;
    pixKey?: string | null;
    pixKeyType?: PixKeyType | null;
    pixKeyConfidence?: PixKeyConfidence | null;
    pixKeyDetectionReason?: string | null;
    totalAmountCents: number;
    preEventAmountCents: number;
    postEventAmountCents: number;
    importedStatus: ImportedSpreadsheetStatus;
    supplierStatus: FairSupplierStatus;
    notes?: string | null;
    installments: FairSupplierInstallment[];
  };
  errors: string[];
  warnings: string[];
};

export type ImportSupplierPreviewResponse = {
  summary: {
    totalRows: number;
    validCount: number;
    newCount: number;
    updateCount: number;
    skipCount: number;
    errorCount: number;
    warningCount: number;
    totalAmountCents: number;
    preEventAmountCents: number;
    postEventAmountCents: number;
  };
  rows: ImportSupplierPreviewRow[];
};

export type ConfirmSupplierImportResponse = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
};

export type FairSupplierImportConfig = {
  id?: string;
  fairId: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
};
