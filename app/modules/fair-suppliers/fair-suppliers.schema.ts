"use client";

import { z } from "zod";

export const supplierStatusValues = [
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;

export const supplierInstallmentStatusValues = [
  "PENDING",
  "IN_REMITTANCE",
  "PAID",
  "CANCELLED",
] as const;

export const pixRemittanceStatusValues = ["GENERATED", "PAID", "CANCELLED"] as const;

export const pixKeyTypeValues = ["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"] as const;

export const SupplierStatusSchema = z.enum(supplierStatusValues);
export const SupplierInstallmentStatusSchema = z.preprocess((value) => {
  if (value == null || value === "") return "PENDING";
  if (value === "INCLUDED_IN_REMITTANCE") return "IN_REMITTANCE";
  if (value === "PAGO") return "PAID";
  if (value === "NAO_PAGO" || value === "NÃO PAGO") return "PENDING";
  return value;
}, z.enum(supplierInstallmentStatusValues));
export const PixRemittanceStatusSchema = z.enum(pixRemittanceStatusValues);
export const PixKeyTypeSchema = z.enum(pixKeyTypeValues);

const NullableString = z.string().nullable().optional();
const NullableNumber = z.number().nullable().optional();

export const FairSupplierInstallmentSchema = z
  .object({
    id: z.string().optional(),
    number: z.number(),
    amountCents: z.number().default(0),
    dueDate: NullableString,
    paidAmountCents: z.number().default(0).optional(),
    paidAt: NullableString,
    status: SupplierInstallmentStatusSchema.default("PENDING"),
    remittanceId: NullableString,
    remittanceNumber: NullableString,
    remittanceStatus: PixRemittanceStatusSchema.optional().nullable(),
  })
  .passthrough();

export const FairSupplierSchema = z
  .object({
    id: z.string(),
    fairId: z.string().optional(),
    name: z.string(),
    holderName: z.string().nullable().optional(),
    holderDocument: z.string().nullable().optional(),
    document: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    serviceDescription: z.string().nullable().optional(),
    pixKeyType: PixKeyTypeSchema.nullable().optional(),
    pixKey: z.string().nullable().optional(),
    pixKeyConfidence: z.string().nullable().optional(),
    totalAmountCents: z.number().default(0),
    paidAmountCents: z.number().default(0).optional(),
    pendingAmountCents: NullableNumber,
    preEventAmountCents: z.number().optional(),
    postEventAmountCents: z.number().optional(),
    status: z.union([
      SupplierStatusSchema,
      z.enum(["PAGO", "NAO_PAGO", "NÃO PAGO"]),
    ]).default("PENDING"),
    importedStatus: z.enum(["PAGO", "NAO_PAGO", "NÃO PAGO"]).optional(),
    supplierStatus: SupplierStatusSchema.optional(),
    installments: z.array(FairSupplierInstallmentSchema).default([]),
    notes: z.string().nullable().optional(),
    canDelete: z.boolean().optional(),
  })
  .passthrough();

export const FairSuppliersResponseSchema = z
  .object({
    fair: z
      .object({
        id: z.string(),
        name: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
      })
      .passthrough()
      .optional(),
    items: z.array(FairSupplierSchema).default([]),
  })
  .passthrough();

export const ImportSupplierRowSchema = z
  .object({
    rowNumber: z.number(),
    action: z.enum(["CREATE", "UPDATE", "SKIP", "ERROR"]),
    status: z.enum(["VALID", "INVALID", "WARNING"]).default("VALID"),
    supplier: FairSupplierSchema.partial().nullable().optional(),
    errors: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
  })
  .passthrough();

export const FairSuppliersImportPreviewSchema = z
  .object({
    summary: z
      .object({
        totalRows: z.number().default(0),
        newCount: z.number().default(0),
        updateCount: z.number().default(0),
        errorCount: z.number().default(0),
      })
      .passthrough(),
    rows: z.array(ImportSupplierRowSchema).default([]),
  })
  .passthrough();

export const FairSupplierImportConfigSchema = z
  .object({
    id: z.string().optional(),
    fairId: z.string(),
    spreadsheetId: z.string().min(1, "O ID da planilha é obrigatório"),
    sheetName: z.string().min(1, "O nome da aba é obrigatório"),
    headerRow: z.number().min(1),
    dataStartRow: z.number().min(1),
  })
  .passthrough();

export const UpsertFairSupplierPayloadSchema = z.object({
  name: z.string().min(1, "Informe o nome do fornecedor."),
  document: z.string().min(1, "Informe o CPF/CNPJ."),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  serviceDescription: z.string().min(1, "Informe o servico prestado."),
  pixKeyType: PixKeyTypeSchema,
  pixKey: z.string().min(1, "Informe a chave PIX."),
  totalAmountCents: z.number().min(1, "Informe o valor contratado."),
  installments: z
    .array(
      z.object({
        id: z.string().optional(),
        number: z.number(),
        amountCents: z.number().min(1),
        dueDate: z.string().optional().nullable(),
      }),
    )
    .min(1)
    .max(2),
  notes: z.string().optional().nullable(),
});

export type SupplierStatus = z.infer<typeof SupplierStatusSchema>;
export type SupplierInstallmentStatus = z.infer<typeof SupplierInstallmentStatusSchema>;
export type PixKeyType = z.infer<typeof PixKeyTypeSchema>;
export type FairSupplierInstallment = z.infer<typeof FairSupplierInstallmentSchema>;
export type FairSupplier = z.infer<typeof FairSupplierSchema>;
export type FairSuppliersResponse = z.infer<typeof FairSuppliersResponseSchema>;
export type ImportSupplierRow = z.infer<typeof ImportSupplierRowSchema>;
export type FairSuppliersImportPreview = z.infer<typeof FairSuppliersImportPreviewSchema>;
export type UpsertFairSupplierPayload = z.infer<typeof UpsertFairSupplierPayloadSchema>;
export type FairSupplierImportConfig = z.infer<typeof FairSupplierImportConfigSchema>;

export function normalizeDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatDocument(value?: string | null) {
  const digits = normalizeDigits(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value?.trim() || "-";
}

export function formatMoneyBRLFromCents(cents?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

export function getSupplierPaidCents(supplier: FairSupplier) {
  return supplier.paidAmountCents ?? supplier.installments.reduce((acc, i) => acc + (i.paidAmountCents ?? 0), 0);
}

export function getSupplierPendingCents(supplier: FairSupplier) {
  if (typeof supplier.pendingAmountCents === "number") return supplier.pendingAmountCents;
  return Math.max(0, supplier.totalAmountCents - getSupplierPaidCents(supplier));
}

type PayableSupplierInstallmentsOptions = {
  includeInRemittance?: boolean;
};

export function getPayableSupplierInstallments(
  supplier: FairSupplier,
  options: PayableSupplierInstallmentsOptions = {},
) {
  return (supplier.installments ?? []).filter(
    (installment) =>
      installment.id &&
      (installment.status === "PENDING" ||
        (options.includeInRemittance && installment.status === "IN_REMITTANCE")) &&
      (installment.amountCents ?? 0) > (installment.paidAmountCents ?? 0),
  );
}

export function getSupplierRemittanceAvailableCents(
  supplier: FairSupplier,
  options: PayableSupplierInstallmentsOptions = {},
) {
  return getPayableSupplierInstallments(supplier, options).reduce(
    (acc, installment) =>
      acc + Math.max(0, (installment.amountCents ?? 0) - (installment.paidAmountCents ?? 0)),
    0,
  );
}

export function getSupplierInstallmentStats(supplier: FairSupplier) {
  const installments = supplier.installments ?? [];
  return {
    installmentsCount: installments.length,
    paidInstallmentsCount: installments.filter((i) => i.status === "PAID").length,
    pendingInstallmentsCount: installments.filter((i) => i.status === "PENDING").length,
    includedInRemittanceCount: installments.filter((i) => i.status === "IN_REMITTANCE" || !!i.remittanceId).length,
  };
}

export function getDisplaySupplierStatus(supplier: FairSupplier): SupplierStatus {
  if (supplier.status) {
    if (supplier.status === "PAGO") return "PAID";
    if (supplier.status === "NAO_PAGO" || supplier.status === "NÃO PAGO") return "PENDING";
    return supplier.status as SupplierStatus;
  }
  const pending = getSupplierPendingCents(supplier);
  const paid = getSupplierPaidCents(supplier);
  if (pending <= 0) return "PAID";
  if (paid > 0) return "PARTIALLY_PAID";
  return "PENDING";
}

export function validateSupplierForPixRemittance(
  supplier: FairSupplier,
  options: PayableSupplierInstallmentsOptions = {},
) {
  const warnings: string[] = [];
  const documentDigits = normalizeDigits(supplier.document);
  const pixType = supplier.pixKeyType;
  const pixKey = supplier.pixKey?.trim() ?? "";
  const installmentsTotal = supplier.installments.reduce((acc, i) => acc + (i.amountCents ?? 0), 0);

  if (!supplier.name?.trim()) warnings.push("Nome obrigatorio");
  if (![11, 14].includes(documentDigits.length)) warnings.push("Documento invalido");
  if (!pixType || !pixKey) warnings.push("PIX incompleto");
  if (getPayableSupplierInstallments(supplier, options).length === 0) warnings.push("Sem parcela pagavel");
  if (supplier.installments.some((i) => !i.amountCents || i.amountCents <= 0)) warnings.push("Parcela sem valor");
  if (installmentsTotal !== supplier.totalAmountCents) warnings.push("Parcela divergente");
  if (getSupplierRemittanceAvailableCents(supplier, options) <= 0 && getDisplaySupplierStatus(supplier) !== "PAID") warnings.push("Valor pendente zerado");

  if (pixType === "CPF" && normalizeDigits(pixKey).length !== 11) warnings.push("Chave CPF invalida");
  if (pixType === "CNPJ" && normalizeDigits(pixKey).length !== 14) warnings.push("Chave CNPJ invalida");
  if (pixType === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey)) warnings.push("E-mail PIX invalido");
  if (pixType === "PHONE" && normalizeDigits(pixKey).length < 10) warnings.push("Telefone PIX invalido");
  if (pixType === "RANDOM" && pixKey.length < 8) warnings.push("Chave aleatoria invalida");

  return warnings;
}
