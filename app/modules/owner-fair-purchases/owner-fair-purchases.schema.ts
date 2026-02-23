import { z } from "zod"

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

/** =========================
 * PAYMENTS - settle installments (atalho)
 * ========================= */

export const SettleInstallmentsActionSchema = z.enum(["SET_PAID", "SET_UNPAID"])
export type SettleInstallmentsAction = z.infer<
  typeof SettleInstallmentsActionSchema
>

export const SettleInstallmentsInputSchema = z
  .object({
    purchaseId: z.string().min(1, "purchaseId é obrigatório."),
    action: SettleInstallmentsActionSchema,

    payAll: z.boolean().optional(),
    numbers: z.array(z.number().int().positive()).optional(),

    paidAt: DateOnlySchema.optional(),
    paidAmountCents: z.number().int().positive().optional(),
  })
  .refine(
    (v) =>
      v.payAll === true || (Array.isArray(v.numbers) && v.numbers.length > 0),
    {
      message: "Informe payAll=true ou numbers=[...].",
      path: ["numbers"],
    },
  )
export type SettleInstallmentsInput = z.infer<typeof SettleInstallmentsInputSchema>

export const OwnerFairStatusInfoSchema = z.object({
  requestedStatus: OwnerFairStatusSchema.optional(),
  appliedStatus: OwnerFairStatusSchema.optional(),
  computedStatus: OwnerFairStatusSchema.optional(),

  notes: z.array(z.string()).optional(),
  missing: z.array(z.string()).optional(),
})
export type OwnerFairStatusInfo = z.infer<typeof OwnerFairStatusInfoSchema>

export const SettleInstallmentsResponseSchema = z.object({
  ok: z.boolean(),
  purchaseId: z.string(),
  status: OwnerFairPaymentStatusSchema,
  installmentsCount: z.number(),
  paidCount: z.number(),
  paidCents: z.number(),
  totalCents: z.number(),

  ownerFairStatus: OwnerFairStatusSchema.nullable().optional(),
  ownerFairStatusInfo: OwnerFairStatusInfoSchema.nullable().optional(),
})
export type SettleInstallmentsResponse = z.infer<
  typeof SettleInstallmentsResponseSchema
>

/** =========================
 * PAYMENTS - reschedule installment
 * ========================= */

export const RescheduleInstallmentInputSchema = z.object({
  dueDate: DateOnlySchema,
  reason: z.string().max(500).optional(),
})
export type RescheduleInstallmentInput = z.infer<
  typeof RescheduleInstallmentInputSchema
>

/** =========================
 * PAYMENTS - create installment payment (histórico)
 * ========================= */

export const CreateInstallmentPaymentInputSchema = z.object({
  paidAt: DateOnlySchema,
  amountCents: z.number().int().positive(),
  note: z.string().max(500).optional(),
})
export type CreateInstallmentPaymentInput = z.infer<
  typeof CreateInstallmentPaymentInputSchema
>

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

  ownerFairStatus: OwnerFairStatusSchema.nullable().optional(),
  ownerFairStatusInfo: OwnerFairStatusInfoSchema.nullable().optional(),
})
export type InstallmentPaymentActionResponse = z.infer<
  typeof InstallmentPaymentActionResponseSchema
>

/** =========================
 * PURCHASE ADJUSTMENTS (desconto / acréscimo)
 * ========================= */

export const PurchaseAdjustmentTypeSchema = z.enum(["DISCOUNT", "SURCHARGE"])
export type PurchaseAdjustmentType = z.infer<typeof PurchaseAdjustmentTypeSchema>

export const PurchaseAdjustmentSchema = z.object({
  id: z.string(),
  purchaseId: z.string(),
  type: PurchaseAdjustmentTypeSchema,
  amountCents: z.number().int().positive(),
  reason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
})
export type PurchaseAdjustment = z.infer<typeof PurchaseAdjustmentSchema>

export const CreatePurchaseAdjustmentInputSchema = z.object({
  type: PurchaseAdjustmentTypeSchema,
  amountCents: z.number().int().positive(),
  reason: z.string().max(500).optional(),
})
export type CreatePurchaseAdjustmentInput = z.infer<
  typeof CreatePurchaseAdjustmentInputSchema
>

export const CreatePurchaseAdjustmentResponseSchema = z.object({
  ok: z.boolean(),

  adjustment: PurchaseAdjustmentSchema,

  purchase: z.object({
    id: z.string(),
    totalCents: z.number(),
    paidCents: z.number(),
    status: OwnerFairPaymentStatusSchema,
    paidAt: z.string().datetime().nullable().optional(),
  }),

  totals: z
    .object({
      originalTotal: z.number(),
      totalDiscount: z.number(),
      totalSurcharge: z.number(),
      effectiveTotalCents: z.number(),
    })
    .optional(),
})
export type CreatePurchaseAdjustmentResponse = z.infer<
  typeof CreatePurchaseAdjustmentResponseSchema
>