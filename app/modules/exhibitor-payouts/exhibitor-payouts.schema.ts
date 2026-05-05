"use client";

import { z } from "zod";

export const pixKeyTypeValues = ["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"] as const;

export const PayoutImportActionSchema = z.enum(["CREATE", "UPDATE", "SKIP", "ERROR"]);
export const PayoutImportStatusSchema = z.enum(["VALID", "WARNING", "INVALID"]);
export const PixKeyTypeSchema = z.enum(pixKeyTypeValues);

const NullableString = z.string().nullable().optional();

export const ExhibitorPayoutOwnerSchema = z
  .object({
    id: NullableString,
    fullName: NullableString,
    document: NullableString,
    email: NullableString,
    phone: NullableString,
  })
  .passthrough();

export const ExhibitorPayoutOwnerFairSchema = z
  .object({
    id: NullableString,
    ownerId: NullableString,
    fairId: NullableString,
    status: NullableString,
    owner: ExhibitorPayoutOwnerSchema.nullable().optional(),
  })
  .passthrough();

export const ExhibitorPayoutSchema = z
  .object({
    id: NullableString,
    fairId: NullableString,
    ownerId: NullableString,
    ownerFairId: NullableString,
    ownerFair: ExhibitorPayoutOwnerFairSchema.nullable().optional(),
    owner: ExhibitorPayoutOwnerSchema.nullable().optional(),
    nomeTitularConta: NullableString,
    holderName: NullableString,
    name: NullableString,
    documentoTitularConta: NullableString,
    holderDocument: NullableString,
    document: NullableString,
    chavePix: NullableString,
    pixKey: NullableString,
    pixKeyType: PixKeyTypeSchema.nullable().optional(),
    valorTotal: z.union([z.string(), z.number()]).nullable().optional(),
    netAmountCents: z.number().nullable().optional(),
    amountCents: z.number().nullable().optional(),
    totalAmountCents: z.number().nullable().optional(),
    status: NullableString,
    createdAt: NullableString,
    updatedAt: NullableString,
  })
  .passthrough();

export const ExhibitorPayoutsResponseSchema = z
  .object({
    fair: z
      .object({
        id: z.string(),
        name: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
      })
      .passthrough()
      .optional(),
    items: z.array(ExhibitorPayoutSchema).default([]),
  })
  .passthrough();

export const ImportExhibitorPayoutRowSchema = z
  .object({
    rowNumber: z.number(),
    action: PayoutImportActionSchema,
    status: PayoutImportStatusSchema.default("VALID"),
    payout: ExhibitorPayoutSchema.partial().nullable().optional(),
    exhibitorPayout: ExhibitorPayoutSchema.partial().nullable().optional(),
    ownerFair: ExhibitorPayoutOwnerFairSchema.nullable().optional(),
    owner: ExhibitorPayoutOwnerSchema.nullable().optional(),
    nomeTitularConta: NullableString,
    documentoTitularConta: NullableString,
    chavePix: NullableString,
    pixKeyType: PixKeyTypeSchema.nullable().optional(),
    valorTotal: z.union([z.string(), z.number()]).nullable().optional(),
    netAmountCents: z.number().nullable().optional(),
    errors: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
  })
  .passthrough();

export const ExhibitorPayoutsImportPreviewSchema = z
  .object({
    summary: z
      .object({
        totalRows: z.number().default(0),
        validCount: z.number().default(0),
        newCount: z.number().default(0),
        updateCount: z.number().default(0),
        errorCount: z.number().default(0),
        warningCount: z.number().default(0),
      })
      .passthrough(),
    rows: z.array(ImportExhibitorPayoutRowSchema).default([]),
  })
  .passthrough();

export const ExhibitorPayoutImportConfigSchema = z
  .object({
    id: z.string().optional(),
    fairId: z.string().optional(),
    spreadsheetId: z.string().min(1, "Informe o ID da planilha."),
    sheetName: z.string().min(1, "Informe o nome da aba."),
    headerRow: z.number().min(1),
    dataStartRow: z.number().min(1),
  })
  .passthrough();

export type PixKeyType = z.infer<typeof PixKeyTypeSchema>;
export type PayoutImportAction = z.infer<typeof PayoutImportActionSchema>;
export type PayoutImportStatus = z.infer<typeof PayoutImportStatusSchema>;
export type ExhibitorPayout = z.infer<typeof ExhibitorPayoutSchema>;
export type ExhibitorPayoutsResponse = z.infer<typeof ExhibitorPayoutsResponseSchema>;
export type ImportExhibitorPayoutRow = z.infer<typeof ImportExhibitorPayoutRowSchema>;
export type ExhibitorPayoutsImportPreview = z.infer<typeof ExhibitorPayoutsImportPreviewSchema>;
export type ExhibitorPayoutImportConfig = z.infer<typeof ExhibitorPayoutImportConfigSchema>;

export const DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG = {
  spreadsheetId: "1YGInOf0tRZzh5GYunmbP_eud67-prd2FuYM3VBnJ6hk",
  sheetName: "Remessa Pix",
  headerRow: 3,
  dataStartRow: 4,
};

export function normalizeDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatDocument(value?: string | null) {
  const digits = normalizeDigits(value);
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value?.trim() || "-";
}

export function formatMoneyBRLFromCents(cents?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

export function getPayoutName(payout?: Partial<ExhibitorPayout> | null) {
  return (
    payout?.nomeTitularConta?.trim() ||
    payout?.holderName?.trim() ||
    payout?.name?.trim() ||
    payout?.owner?.fullName?.trim() ||
    payout?.ownerFair?.owner?.fullName?.trim() ||
    "-"
  );
}

export function getPayoutDocument(payout?: Partial<ExhibitorPayout> | null) {
  return (
    payout?.documentoTitularConta?.trim() ||
    payout?.holderDocument?.trim() ||
    payout?.document?.trim() ||
    payout?.owner?.document?.trim() ||
    payout?.ownerFair?.owner?.document?.trim() ||
    null
  );
}

export function getPayoutPixKey(payout?: Partial<ExhibitorPayout> | null) {
  return payout?.chavePix?.trim() || payout?.pixKey?.trim() || null;
}

export function getPayoutAmountCents(payout?: Partial<ExhibitorPayout> | null) {
  return payout?.netAmountCents ?? payout?.amountCents ?? payout?.totalAmountCents ?? null;
}

export function getImportRowPayout(row: ImportExhibitorPayoutRow): Partial<ExhibitorPayout> {
  return row.payout ?? row.exhibitorPayout ?? {
    nomeTitularConta: row.nomeTitularConta,
    documentoTitularConta: row.documentoTitularConta,
    chavePix: row.chavePix,
    pixKeyType: row.pixKeyType,
    valorTotal: row.valorTotal,
    netAmountCents: row.netAmountCents,
    owner: row.owner,
    ownerFair: row.ownerFair,
  };
}

export function parsePayoutAmountCents(payout?: Partial<ExhibitorPayout> | null) {
  const cents = getPayoutAmountCents(payout);
  if (typeof cents === "number" && Number.isFinite(cents)) return cents;

  const rawValue = payout?.valorTotal;
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return Math.round(rawValue * 100);
  }

  if (rawValue == null || String(rawValue).trim() === "") return 0;

  const clean = String(rawValue).trim().replace(/[^0-9.,-]/g, "");
  if (!clean) return 0;

  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const value = Number.parseFloat(normalized);

  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}
