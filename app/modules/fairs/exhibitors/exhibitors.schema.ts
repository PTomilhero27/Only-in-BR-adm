/**
 * Contratos do módulo "fairs/exhibitors" (painel).
 * Motivo: validar payload com Zod e evitar contratos implícitos.
 *
 * Nesta etapa:
 * - O endpoint GET /fairs/:id/exhibitors devolve:
 *   - fair com capacidade (stallsCapacity/reserved/remaining)
 *   - items com resumo de pagamento (payment)
 * - Removemos paidAt do OwnerFair (fonte de verdade agora é o plano/parcelas)
 */
import { z } from "zod"

export const OwnerFairStatusSchema = z.enum([
  "SELECIONADO",
  "AGUARDANDO_PAGAMENTO",
  "AGUARDANDO_ASSINATURA",
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

/**
 * Owner retornado no contexto de expositores da feira.
 * Decisão:
 * - Mantemos campos extras (address/pix/banco) para tooltips e detalhe rápido na tabela,
 *   evitando buscar isso em outra tela.
 */
export const FairExhibitorOwnerSchema = z.object({
  id: z.string(),
  personType: z.enum(["PF", "PJ"]),
  document: z.string(),

  fullName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),

  addressFull: z.string().nullable().optional(),

  bankAccount: z.string().nullable().optional(),
  bankAccountType: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  pixKey: z.string().nullable().optional(),
})
export type FairExhibitorOwner = z.infer<typeof FairExhibitorOwnerSchema>

export const FairExhibitorSlotSchema = z.object({
  stallSize: StallSizeSchema,
  qty: z.number(),
  unitPriceCents: z.number(),
})
export type FairExhibitorSlot = z.infer<typeof FairExhibitorSlotSchema>

export const FairLinkedStallSchema = z.object({
  id: z.string(),
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
 * Parcela (para exibir no modal de pagamentos).
 */
export const FairPaymentInstallmentSchema = z.object({
  number: z.number(),
  dueDate: z.string().datetime(),
  amountCents: z.number(),

  /**
   * Prisma:
   * - paidAt pode ser null
   * - paidAmountCents pode ser null
   */
  paidAt: z.string().datetime().nullable().optional(),
  paidAmountCents: z.number().nullable().optional(),
})
export type FairPaymentInstallment = z.infer<typeof FairPaymentInstallmentSchema>

/**
 * Resumo do plano de pagamento (para tabela e modal).
 *
 * Observação:
 * - installments pode vir (para modal) ou não (se no futuro quisermos payload menor).
 * - dueDates também pode ser omitido no MVP.
 */
export const FairPaymentSummarySchema = z.object({
  status: OwnerFairPaymentStatusSchema,

  totalCents: z.number(),
  installmentsCount: z.number(),
  paidCount: z.number(),

  nextDueDate: z.string().datetime().nullable().optional(),

  /**
   * ✅ Flexível:
   * - pode vir do backend como lista simples (se você montar)
   * - ou pode não vir no MVP
   */
  dueDates: z.array(z.string().datetime()).optional(),

  /**
   * ✅ importante pra UI (badge / cor)
   */
  overdueCount: z.number(),

  /**
   * ✅ modal usa installments (quando vier)
   */
  installments: z.array(FairPaymentInstallmentSchema).optional(),
})
export type FairPaymentSummary = z.infer<typeof FairPaymentSummarySchema>

export const FairExhibitorRowSchema = z.object({
  ownerFairId: z.string(),
  fairId: z.string(),
  owner: FairExhibitorOwnerSchema,

  stallsQtyPurchased: z.number(),
  stallSlots: z.array(FairExhibitorSlotSchema),

  stallsQtyLinked: z.number(),
  linkedStalls: z.array(FairLinkedStallSchema),

  status: OwnerFairStatusSchema,
  isComplete: z.boolean(),

  /**
   * ✅ Agora pago é derivado do plano/parcelas.
   */
  contractSignedAt: z.string().datetime().nullable().optional(),

  /**
   * ✅ Novo: resumo do pagamento (pode ser null se não configurado).
   */
  payment: FairPaymentSummarySchema.nullable().optional(),
})
export type FairExhibitorRow = z.infer<typeof FairExhibitorRowSchema>

/**
 * Header da feira para a tela (sem outra chamada).
 */
export const FairSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ATIVA", "FINALIZADA", "CANCELADA"]),
  address: z.string(),

  stallsCapacity: z.number().optional(),
  stallsReserved: z.number().optional(),
  stallsRemaining: z.number().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  occurrences: z.array(
    z.object({
      id: z.string(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    }),
  ),
})
export type FairSummary = z.infer<typeof FairSummarySchema>

export const FairExhibitorsResponseSchema = z.object({
  fair: FairSummarySchema,
  items: z.array(FairExhibitorRowSchema),
})
export type FairExhibitorsResponse = z.infer<typeof FairExhibitorsResponseSchema>

export const UpdateExhibitorStatusInputSchema = z.object({
  status: OwnerFairStatusSchema,
})
export type UpdateExhibitorStatusInput = z.infer<typeof UpdateExhibitorStatusInputSchema>

/**
 * Resposta do PATCH status (mantemos compat).
 */
export const UpdateExhibitorStatusResponseSchema = z.object({
  id: z.string(), // ownerFairId
  ownerId: z.string(),
  fairId: z.string(),

  status: OwnerFairStatusSchema,
  stallsQty: z.number(),

  paidAt: z.string().nullable().optional(),
  contractSignedAt: z.string().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type UpdateExhibitorStatusResponse = z.infer<typeof UpdateExhibitorStatusResponseSchema>

/**
 * Inputs/Outputs do pagamento (parcelas).
 * Um único endpoint/mutation com "action" para marcar/desmarcar.
 */
export const SettleInstallmentsActionSchema = z.enum(["SET_PAID", "SET_UNPAID"])
export type SettleInstallmentsAction = z.infer<typeof SettleInstallmentsActionSchema>

export const SettleInstallmentsInputSchema = z
  .object({
    action: SettleInstallmentsActionSchema,
    payAll: z.boolean().optional(),
    numbers: z.array(z.number().int().positive()).optional(),

    paidAt: z.string().datetime().optional(),
    paidAmountCents: z.number().int().positive().optional(),
  })
  .refine((v) => v.payAll === true || (Array.isArray(v.numbers) && v.numbers.length > 0), {
    message: "Informe payAll=true ou numbers=[...].",
    path: ["numbers"],
  })
export type SettleInstallmentsInput = z.infer<typeof SettleInstallmentsInputSchema>

export const SettleInstallmentsResponseSchema = z.object({
  ok: z.boolean(),
  planId: z.string(),
  status: OwnerFairPaymentStatusSchema,
  installmentsCount: z.number(),
  paidCount: z.number(),
  message: z.string().optional(),
})
export type SettleInstallmentsResponse = z.infer<typeof SettleInstallmentsResponseSchema>

/** Helpers */
export function exhibitorDisplayName(row: FairExhibitorRow) {
  return row.owner.fullName?.trim() || "—"
}

export function exhibitorDisplayDoc(row: FairExhibitorRow) {
  return row.owner.document || "—"
}

/**
 * Contato "principal" (para busca e exibição curta).
 */
export function exhibitorDisplayContact(row: FairExhibitorRow) {
  return row.owner.phone?.trim() || row.owner.email?.trim() || row.owner.pixKey?.trim() || "—"
}

export function ownerFairStatusLabel(status: OwnerFairStatus) {
  switch (status) {
    case "SELECIONADO":
      return "Selecionado"
    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento"
    case "AGUARDANDO_ASSINATURA":
      return "Aguardando assinatura"
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

export function slotsSummary(slots: FairExhibitorSlot[]) {
  if (!slots?.length) return "—"
  return slots
    .filter((s) => (s.qty ?? 0) > 0)
    .map((s) => `${stallSizeLabel(s.stallSize)}: ${s.qty}`)
    .join(" · ")
}

/**
 * Helpers de pagamento para UI:
 * - texto "1/3"
 */
export function paymentInstallmentsLabel(payment: FairPaymentSummary | null | undefined) {
  if (!payment) return "—"
  return `${payment.paidCount}/${payment.installmentsCount}`
}
