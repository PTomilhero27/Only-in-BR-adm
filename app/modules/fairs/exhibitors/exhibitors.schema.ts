/**
 * Contratos do módulo "fairs/exhibitors" (painel admin).
 * Motivo: validar payload com Zod e evitar contratos implícitos.
 *
 * ✅ Atualizado para o novo financeiro por "compra" (OwnerFairPurchase) + histórico:
 * - items[].payment agora é agregado por purchases (não por StallFair)
 * - items[].purchasesPayments traz detalhe por compra e suas parcelas
 * - items[].stallFairs traz barracas vinculadas com a compra consumida
 * - actions financeiras:
 *   - settle (atalho): marca/desfaz parcelas por purchaseId
 *   - reschedule: muda vencimento (dueDate) de 1 parcela
 *   - createPayment: registra pagamento parcial (histórico)
 *
 * ✅ Atualizações recentes:
 * - Owner agora inclui endereço + pagamento (campos do model Owner)
 * - Status inclui AGUARDANDO_BARRACAS
 * - settle response inclui paidCents/totalCents
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

/**
 * Owner dentro do contexto da feira (expositor).
 * Responsabilidade:
 * - Dados de identificação e contato (tabela)
 * - ✅ Endereço e Pagamento (modal “Dados”)
 *
 * Observação:
 * - Campos opcionais/nullable porque podem não estar preenchidos.
 * - Mantemos o schema tolerante para evolução do backend sem quebrar UI.
 */
export const FairExhibitorOwnerSchema = z.object({
  id: z.string(),
  personType: z.enum(["PF", "PJ"]),
  document: z.string(),

  fullName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),

  // -------------------------
  // ✅ Endereço (Owner)
  // -------------------------
  addressFull: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZipcode: z.string().nullable().optional(),
  addressNumber: z.string().nullable().optional(),

  // -------------------------
  // ✅ Pagamento (Owner)
  // -------------------------
  pixKey: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankAccountType: BankAccountTypeSchema.nullable().optional(),

  bankHolderDoc: z.string().nullable().optional(),
  bankHolderName: z.string().nullable().optional(),

  // -------------------------
  // ✅ Extra
  // -------------------------
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

/**
 * Compra "resumida" que uma StallFair consumiu (para UI mostrar slot consumido).
 */
export const FairConsumedPurchaseSchema = z.object({
  id: z.string(),
  stallSize: StallSizeSchema,
  unitPriceCents: z.number(),
  qty: z.number(),
  usedQty: z.number(),
  status: OwnerFairPaymentStatusSchema,
})
export type FairConsumedPurchase = z.infer<typeof FairConsumedPurchaseSchema>

/**
 * Vínculo de barraca na feira (StallFair) com a compra consumida.
 */
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

/**
 * Parcela (installment) da compra.
 * Observação:
 * - paidAt aqui é cache de "quitada" (pode ser null)
 * - paidAmountCents é o somatório pago (cache)
 */
export const PurchaseInstallmentSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountCents: z.number().int().nonnegative(),

  paidAt: z.string().datetime().nullable(),
  paidAmountCents: z.number().int().nonnegative().nullable(),
})
export type PurchaseInstallment = z.infer<typeof PurchaseInstallmentSchema>

/**
 * Detalhe de pagamento por COMPRA (OwnerFairPurchase) para UI admin.
 * Esse objeto já vem pré-processado no backend (`toPurchasePaymentSummary`).
 */
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

/**
 * Pagamento agregado do expositor na feira (derivado das purchases).
 * ⚠️ Esse é o objeto que o backend retorna hoje em `payment: aggregatedPayment`.
 */
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
  // obs: backend no listExhibitors não está retornando assinafySignerId no summary da instance
  // então deixamos opcional/nullable pra evitar quebrar caso volte.
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

  // ✅ mantém para UI (lista simples de stalls)
  linkedStalls: z.array(FairLinkedStallSchema),

  status: OwnerFairStatusSchema,
  isComplete: z.boolean(),

  contractSignedAt: z.string().datetime().nullable(),

  // ✅ pagamento agregado (novo shape)
  payment: AggregatedPaymentSchema,

  // ✅ detalhe por compra
  purchasesPayments: z.array(PurchasePaymentSummarySchema),

  // ✅ opcional para UI: lista de StallFair com purchase consumida
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

export const UpdateExhibitorStatusResponseSchema = z.object({
  id: z.string(), // ownerFairId
  ownerId: z.string(),
  fairId: z.string(),

  status: OwnerFairStatusSchema,
  stallsQty: z.number(),

  contractSignedAt: z.string().datetime().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type UpdateExhibitorStatusResponse = z.infer<typeof UpdateExhibitorStatusResponseSchema>

/** =========================
 * PAYMENTS - settle installments (atalho)
 * ========================= */

export const SettleInstallmentsActionSchema = z.enum(["SET_PAID", "SET_UNPAID"])
export type SettleInstallmentsAction = z.infer<typeof SettleInstallmentsActionSchema>

/**
 * ✅ Agora settle precisa saber qual COMPRA será afetada.
 * O backend vai trabalhar nas parcelas daquela purchase.
 */
export const SettleInstallmentsInputSchema = z
  .object({
    purchaseId: z.string().min(1, "purchaseId é obrigatório."),
    action: SettleInstallmentsActionSchema,

    payAll: z.boolean().optional(),
    numbers: z.array(z.number().int().positive()).optional(),

    /**
     * Data do pagamento (date-only).
     * O backend normaliza pra 00:00Z.
     */
    paidAt: DateOnlySchema.optional(),

    /**
     * Para o atalho, geralmente não precisamos.
     * Se você quiser que o backend use esse valor como pagamento "fixo" no SET_PAID,
     * pode manter aqui — mas na abordagem com histórico,
     * o ideal é o atalho quitar o restante automaticamente.
     */
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

  // ✅ o backend retorna hoje
  paidCents: z.number(),
  totalCents: z.number(),
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

/**
 * Resposta padronizada para ações em parcela:
 * - create payment
 * - reschedule
 */
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
})
export type InstallmentPaymentActionResponse = z.infer<
  typeof InstallmentPaymentActionResponseSchema
>

/** =========================
 * HELPERS
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

/**
 * "paid/total" das parcelas de uma compra (ex.: 1/3).
 */
export function purchaseInstallmentsLabel(p: PurchasePaymentSummary) {
  return `${p.paidCount}/${p.installmentsCount}`
}
