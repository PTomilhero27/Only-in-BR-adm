import { z } from "zod"

/**
 * Este módulo representa o vínculo Interessado (Owner) ↔ Feira (Fair).
 *
 * Evolução do contrato:
 * - stallsQty é DERIVADO no backend a partir de stallSlots.
 * - Agora também existe paymentPlan (plano + parcelas), persistido no backend.
 */

// ✅ Espelho do enum StallSize (Prisma) no front.
export const StallSizeSchema = z.enum(["SIZE_2X2", "SIZE_3X3", "SIZE_3X6", "TRAILER"])
export type StallSize = z.infer<typeof StallSizeSchema>

// ✅ Espelho do enum OwnerFairPaymentStatus (Prisma) no front.
export const OwnerFairPaymentStatusSchema = z.enum([
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
])
export type OwnerFairPaymentStatus = z.infer<typeof OwnerFairPaymentStatusSchema>

// ✅ Item de compra por tamanho (slot)
export const OwnerFairStallSlotSchema = z.object({
  stallSize: StallSizeSchema,
  qty: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
})
export type OwnerFairStallSlot = z.infer<typeof OwnerFairStallSlotSchema>

/**
 * Parcelas do plano (payload do front usa date-only YYYY-MM-DD).
 * No list, o backend devolve também como YYYY-MM-DD.
 */
export const PaymentInstallmentSchema = z.object({
  number: z.number().int().min(1),
  dueDate: z.string().min(1), // YYYY-MM-DD
  amountCents: z.number().int().min(0),

  // null => não pago
  paidAt: z.string().nullable().optional(), // YYYY-MM-DD | null
  paidAmountCents: z.number().int().min(0).nullable().optional(),
})
export type PaymentInstallment = z.infer<typeof PaymentInstallmentSchema>

export const PaymentPlanSchema = z.object({
  installmentsCount: z.number().int().min(1).max(12),
  totalCents: z.number().int().min(0),
  status: OwnerFairPaymentStatusSchema.optional(), // no create/update não precisa mandar, no list vem
  installments: z.array(PaymentInstallmentSchema).min(1),
})
export type PaymentPlan = z.infer<typeof PaymentPlanSchema>

// ✅ Item retornado pela listagem do vínculo
export const InterestFairItemSchema = z.object({
  fairId: z.string(),
  fairName: z.string(),

  stallsQty: z.number().int(),

  stallSlots: z.array(OwnerFairStallSlotSchema),

  // ✅ Agora vem no list
  paymentPlan: PaymentPlanSchema.nullable(),

  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ListInterestFairsResponseSchema = z.object({
  ownerId: z.string(),
  items: z.array(InterestFairItemSchema),
})

export type InterestFairItem = z.infer<typeof InterestFairItemSchema>
export type ListInterestFairsResponse = z.infer<typeof ListInterestFairsResponseSchema>

/**
 * ✅ Payload de criação do vínculo (POST /interests/:id/fairs)
 * Agora envia stallSlots + paymentPlan (obrigatório).
 */
export const LinkInterestToFairInputSchema = z.object({
  fairId: z.string().min(1),
  stallSlots: z.array(OwnerFairStallSlotSchema).min(1),

  // backend exige
  paymentPlan: PaymentPlanSchema,
})

export type LinkInterestToFairInput = z.infer<typeof LinkInterestToFairInputSchema>

/**
 * ✅ Payload de atualização (PATCH /interests/:id/fairs/:fairId)
 * Substitui slots e plano (MVP: replace all).
 */
export const UpdateInterestFairInputSchema = z.object({
  stallSlots: z.array(OwnerFairStallSlotSchema).min(1),
  paymentPlan: PaymentPlanSchema,
})

export type UpdateInterestFairInput = z.infer<typeof UpdateInterestFairInputSchema>
