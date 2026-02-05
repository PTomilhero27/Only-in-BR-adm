/**
 * Contratos do módulo "fairs/exhibitors" (painel admin).
 * Motivo: validar payload com Zod e evitar contratos implícitos.
 *
 * ✅ Atualizado:
 * - OwnerFair agora inclui `observations`
 * - PATCH status retorna `{ ownerFair, info }` (status aplicado + motivos)
 * - Actions financeiras retornam `ownerFairStatus` e `ownerFairStatusInfo`
 */
import { z } from "zod"

/** =========================
 * Helpers de datas
 * ========================= */

/**
 * Date-only (YYYY-MM-DD) usado para vencimento/pagamento em telas administrativas,
 * evitando bugs de timezone (o backend normaliza para 00:00Z).
 */
export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD.")
export type DateOnly = z.infer<typeof DateOnlySchema>

/** =========================
 * ENUMS (domínio)
 * ========================= */

export const OwnerFairStatusSchema = z.enum([
  "SELECIONADO",
  "AGUARDANDO_PAGAMENTO",
  "AGUARDANDO_ASSINATURA",
  "AGUARDANDO_BARRACAS",
  "CONCLUIDO",
])
export type OwnerFairStatus = z.infer<typeof OwnerFairStatusSchema>

export const OwnerFairPaymentStatusSchema = z.enum([
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
])
export type OwnerFairPaymentStatus = z.infer<typeof OwnerFairPaymentStatusSchema>

export const StallSizeSchema = z.enum(["SIZE_2X2", "SIZE_3X3", "SIZE_3X6", "TRAILER"])
export type StallSize = z.infer<typeof StallSizeSchema>

export const StallTypeSchema = z.enum(["OPEN", "CLOSED", "TRAILER"])
export type StallType = z.infer<typeof StallTypeSchema>

export const ContractTemplateStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
export type ContractTemplateStatus = z.infer<typeof ContractTemplateStatusSchema>

export const BankAccountTypeSchema = z.enum(["CORRENTE", "POUPANCA", "PAGAMENTO"])
export type BankAccountType = z.infer<typeof BankAccountTypeSchema>

/** =========================
 * OWNER / EXHIBITOR (linha)
 * ========================= */

export const FairExhibitorOwnerSchema = z.object({
  id: z.string(),
  personType: z.enum(["PF", "PJ"]),
  document: z.string(),

  fullName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),

  // ✅ Endereço
  addressFull: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZipcode: z.string().nullable().optional(),
  addressNumber: z.string().nullable().optional(),

  // ✅ Pagamento
  pixKey: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankAccountType: BankAccountTypeSchema.nullable().optional(),

  bankHolderDoc: z.string().nullable().optional(),
  bankHolderName: z.string().nullable().optional(),

  // ✅ Extra
  stallsDescription: z.string().nullable().optional(),
})
export type FairExhibitorOwner = z.infer<typeof FairExhibitorOwnerSchema>

/** =========================
 * STALL (detalhe)
 * ========================= */

export const FairLinkedStallSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  pdvName: z.string(),
  stallType: StallTypeSchema,
  stallSize: StallSizeSchema,
  machinesQty: z.number(),
  bannerName: z.string().nullable().optional(),
  mainCategory: z.string().nullable().optional(),
  teamQty: z.number(),
})
export type FairLinkedStall = z.infer<typeof FairLinkedStallSchema>

export const FairConsumedPurchaseSchema = z.object({
  id: z.string(),
  stallSize: StallSizeSchema,
  unitPriceCents: z.number(),
  qty: z.number(),
  usedQty: z.number(),
  status: OwnerFairPaymentStatusSchema,
})
export type FairConsumedPurchase = z.infer<typeof FairConsumedPurchaseSchema>

export const FairStallFairItemSchema = z.object({
  stallFairId: z.string(),
  stallId: z.string(),
  createdAt: z.string().datetime(),
  stall: FairLinkedStallSchema,
  purchase: FairConsumedPurchaseSchema.nullable(),
})
export type FairStallFairItem = z.infer<typeof FairStallFairItemSchema>

/** =========================
 * PAYMENTS (por compra)
 * ========================= */

export const PurchaseInstallmentSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountCents: z.number().int().nonnegative(),

  paidAt: z.string().datetime().nullable(),
  paidAmountCents: z.number().int().nonnegative().nullable(),
})
export type PurchaseInstallment = z.infer<typeof PurchaseInstallmentSchema>

export const PurchasePaymentSummarySchema = z.object({
  purchaseId: z.string(),
  stallSize: StallSizeSchema,
  qty: z.number(),
  usedQty: z.number(),

  unitPriceCents: z.number(),
  totalCents: z.number(),

  paidCents: z.number(),
  paidAt: z.string().datetime().nullable(),

  status: OwnerFairPaymentStatusSchema,

  installmentsCount: z.number(),
  paidCount: z.number(),
  overdueCount: z.number(),
  nextDueDate: z.string().datetime().nullable(),

  installments: z.array(PurchaseInstallmentSchema),
})
export type PurchasePaymentSummary = z.infer<typeof PurchasePaymentSummarySchema>

export const AggregatedPaymentSchema = z.object({
  status: OwnerFairPaymentStatusSchema,
  totalCents: z.number(),
  paidCents: z.number(),
  purchasesCount: z.number(),
})
export type AggregatedPayment = z.infer<typeof AggregatedPaymentSchema>

/** =========================
 * CONTRACT SETTINGS (fair)
 * ========================= */

export const FairContractSettingsSchema = z
  .object({
    id: z.string(),
    templateId: z.string(),
    updatedAt: z.string().datetime(),
    updatedByUserId: z.string().nullable().optional(),
    template: z.object({
      id: z.string(),
      title: z.string(),
      status: ContractTemplateStatusSchema,
      isAddendum: z.boolean(),
      updatedAt: z.string().datetime(),
    }),
  })
  .nullable()
export type FairContractSettings = z.infer<typeof FairContractSettingsSchema>

/** =========================
 * CONTRACT (item/exhibitor)
 * ========================= */

export const FairContractInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  addendumTemplateId: z.string().nullable(),

  pdfPath: z.string().nullable(),

  assinafyDocumentId: z.string().nullable(),
  assinafySignerId: z.string().nullable().optional(),

  signUrl: z.string().url().nullable().optional(),
  signUrlExpiresAt: z.string().datetime().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type FairContractInstance = z.infer<typeof FairContractInstanceSchema>

export const FairAddendumChoiceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  templateTitle: z.string().nullable(),
  templateStatus: ContractTemplateStatusSchema.nullable(),
  templateVersionNumber: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type FairAddendumChoice = z.infer<typeof FairAddendumChoiceSchema>

export const FairExhibitorContractSchema = z.object({
  fairTemplate: z
    .object({
      id: z.string(),
      title: z.string(),
      status: ContractTemplateStatusSchema,
      updatedAt: z.string().datetime(),
    })
    .nullable(),

  instance: FairContractInstanceSchema.nullable(),
  addendumChoice: FairAddendumChoiceSchema.nullable(),

  signedAt: z.string().datetime().nullable(),

  signUrl: z.string().url().nullable(),
  signUrlExpiresAt: z.string().datetime().nullable().optional(),

  hasPdf: z.boolean(),
  hasContractInstance: z.boolean(),
})
export type FairExhibitorContract = z.infer<typeof FairExhibitorContractSchema>

/** =========================
 * ROW (exhibitor)
 * ========================= */

export const FairExhibitorRowSchema = z.object({
  ownerFairId: z.string(),
  fairId: z.string(),
  owner: FairExhibitorOwnerSchema,

  stallsQtyPurchased: z.number(),
  stallsQtyLinked: z.number(),

  linkedStalls: z.array(FairLinkedStallSchema),

  status: OwnerFairStatusSchema,
  isComplete: z.boolean(),

  contractSignedAt: z.string().datetime().nullable(),

  // ✅ NOVO: observações internas do admin no vínculo Owner ↔ Fair
  observations: z.string().nullable().optional(),

  payment: AggregatedPaymentSchema,
  purchasesPayments: z.array(PurchasePaymentSummarySchema),
  stallFairs: z.array(FairStallFairItemSchema),

  contract: FairExhibitorContractSchema,
})
export type FairExhibitorRow = z.infer<typeof FairExhibitorRowSchema>

/** =========================
 * FAIR HEADER
 * ========================= */

export const FairSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ATIVA", "FINALIZADA", "CANCELADA"]),
  address: z.string(),

  stallsCapacity: z.number(),
  stallsReserved: z.number(),
  stallsRemaining: z.number(),

  occurrences: z.array(
    z.object({
      id: z.string(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    }),
  ),

  contractSettings: FairContractSettingsSchema,

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type FairSummary = z.infer<typeof FairSummarySchema>

/** =========================
 * RESPONSE
 * ========================= */

export const FairExhibitorsResponseSchema = z.object({
  fair: FairSummarySchema,
  items: z.array(FairExhibitorRowSchema),
})
export type FairExhibitorsResponse = z.infer<typeof FairExhibitorsResponseSchema>

/** =========================
 * PATCH status
 * ========================= */

export const UpdateExhibitorStatusInputSchema = z.object({
  status: OwnerFairStatusSchema,
})
export type UpdateExhibitorStatusInput = z.infer<typeof UpdateExhibitorStatusInputSchema>

/**
 * Informações explicativas quando o backend:
 * - ajusta o status aplicado
 * - indica pendências (missing)
 * - inclui notas (notes) para UI (toast/banner)
 */
export const OwnerFairStatusInfoSchema = z.object({
  requestedStatus: OwnerFairStatusSchema.optional(),
  appliedStatus: OwnerFairStatusSchema.optional(),
  computedStatus: OwnerFairStatusSchema.optional(),

  notes: z.array(z.string()).optional(),
  missing: z.array(z.string()).optional(),
})
export type OwnerFairStatusInfo = z.infer<typeof OwnerFairStatusInfoSchema>

/**
 * Resumo do OwnerFair devolvido em mutations.
 * Motivo: front não deve depender do shape inteiro do Prisma.
 */
export const OwnerFairSummarySchema = z.object({
  id: z.string(), // ownerFairId
  ownerId: z.string(),
  fairId: z.string(),

  status: OwnerFairStatusSchema,
  stallsQty: z.number(),

  contractSignedAt: z.string().datetime().nullable().optional(),

  observations: z.string().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type OwnerFairSummary = z.infer<typeof OwnerFairSummarySchema>

export const UpdateExhibitorStatusResponseSchema = z.object({
  ownerFair: OwnerFairSummarySchema,
  info: OwnerFairStatusInfoSchema.optional(),
})
export type UpdateExhibitorStatusResponse = z.infer<typeof UpdateExhibitorStatusResponseSchema>

/** =========================
 * PAYMENTS - settle installments (atalho)
 * ========================= */

export const SettleInstallmentsActionSchema = z.enum(["SET_PAID", "SET_UNPAID"])
export type SettleInstallmentsAction = z.infer<typeof SettleInstallmentsActionSchema>

export const SettleInstallmentsInputSchema = z
  .object({
    purchaseId: z.string().min(1, "purchaseId é obrigatório."),
    action: SettleInstallmentsActionSchema,

    payAll: z.boolean().optional(),
    numbers: z.array(z.number().int().positive()).optional(),

    paidAt: DateOnlySchema.optional(),
    paidAmountCents: z.number().int().positive().optional(),
  })
  .refine((v) => v.payAll === true || (Array.isArray(v.numbers) && v.numbers.length > 0), {
    message: "Informe payAll=true ou numbers=[...].",
    path: ["numbers"],
  })
export type SettleInstallmentsInput = z.infer<typeof SettleInstallmentsInputSchema>

export const SettleInstallmentsResponseSchema = z.object({
  ok: z.boolean(),
  purchaseId: z.string(),
  status: OwnerFairPaymentStatusSchema,
  installmentsCount: z.number(),
  paidCount: z.number(),
  paidCents: z.number(),
  totalCents: z.number(),

  // ✅ NOVO: backend pode recalcular o status do expositor automaticamente
  ownerFairStatus: OwnerFairStatusSchema.nullable().optional(),
  ownerFairStatusInfo: OwnerFairStatusInfoSchema.nullable().optional(),
})
export type SettleInstallmentsResponse = z.infer<typeof SettleInstallmentsResponseSchema>

/** =========================
 * PAYMENTS - reschedule installment
 * ========================= */

export const RescheduleInstallmentInputSchema = z.object({
  dueDate: DateOnlySchema,
  reason: z.string().max(500).optional(),
})
export type RescheduleInstallmentInput = z.infer<typeof RescheduleInstallmentInputSchema>

/** =========================
 * PAYMENTS - create installment payment (histórico)
 * ========================= */

export const CreateInstallmentPaymentInputSchema = z.object({
  paidAt: DateOnlySchema,
  amountCents: z.number().int().positive(),
  note: z.string().max(500).optional(),
})
export type CreateInstallmentPaymentInput = z.infer<typeof CreateInstallmentPaymentInputSchema>

export const InstallmentPaymentActionResponseSchema = z.object({
  ok: z.boolean(),

  purchaseId: z.string(),
  purchaseStatus: OwnerFairPaymentStatusSchema,
  purchaseTotalCents: z.number(),
  purchasePaidCents: z.number(),
  purchasePaidAt: z.string().datetime().nullable(),

  installmentId: z.string(),
  installmentNumber: z.number(),
  installmentAmountCents: z.number(),
  installmentPaidAmountCents: z.number(),
  installmentPaidAt: z.string().datetime().nullable(),
  installmentDueDate: z.string().datetime(),

  // ✅ NOVO: backend pode recalcular o status do expositor automaticamente
  ownerFairStatus: OwnerFairStatusSchema.nullable().optional(),
  ownerFairStatusInfo: OwnerFairStatusInfoSchema.nullable().optional(),
})
export type InstallmentPaymentActionResponse = z.infer<
  typeof InstallmentPaymentActionResponseSchema
>

/** =========================
 * OBSERVATIONS (OwnerFair)
 * ========================= */

export const UpdateExhibitorObservationsInputSchema = z.object({
  observations: z.string().max(2000).nullable().optional(),
})
export type UpdateExhibitorObservationsInput = z.infer<
  typeof UpdateExhibitorObservationsInputSchema
>

export const UpdateExhibitorObservationsResponseSchema = z.object({
  ownerFair: z.object({
    id: z.string(),
    ownerId: z.string().optional(),
    fairId: z.string().optional(),
    observations: z.string().nullable().optional(),
    updatedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime().optional(),
    status: OwnerFairStatusSchema.optional(),
    stallsQty: z.number().optional(),
  }),
})

export type UpdateExhibitorObservationsResponse = z.infer<
  typeof UpdateExhibitorObservationsResponseSchema
>

/** =========================
 * HELPERS (UI)
 * ========================= */

export function exhibitorDisplayName(row: FairExhibitorRow) {
  return row.owner.fullName?.trim() || "—"
}

export function exhibitorDisplayDoc(row: FairExhibitorRow) {
  return row.owner.document || "—"
}

export function exhibitorDisplayContact(row: FairExhibitorRow) {
  return row.owner.phone?.trim() || row.owner.email?.trim() || "—"
}

export function ownerFairStatusLabel(status: OwnerFairStatus) {
  switch (status) {
    case "SELECIONADO":
      return "Selecionado"
    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento"
    case "AGUARDANDO_ASSINATURA":
      return "Aguardando assinatura"
    case "AGUARDANDO_BARRACAS":
      return "Aguardando barracas"
    case "CONCLUIDO":
      return "Concluído"
    default:
      return status
  }
}

export function stallSizeLabel(size: StallSize) {
  switch (size) {
    case "SIZE_2X2":
      return "2m x 2m"
    case "SIZE_3X3":
      return "3m x 3m"
    case "SIZE_3X6":
      return "3m x 6m"
    case "TRAILER":
      return "Trailer"
    default:
      return size
  }
}

export function purchaseInstallmentsLabel(p: PurchasePaymentSummary) {
  return `${p.paidCount}/${p.installmentsCount}`
}
