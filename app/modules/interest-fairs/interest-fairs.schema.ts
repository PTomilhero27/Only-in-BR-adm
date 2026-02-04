import { z } from 'zod'

/**
 * Modelo novo (admin):
 * - OwnerFair é o vínculo âncora
 * - Compras ficam em OwnerFairPurchase (+ installments)
 * - Compras são 1 por 1 (linhas), NÃO AGRUPADAS
 */

// ---------------------------
// Enums (espelho do backend)
// ---------------------------

export const OwnerFairStatusSchema = z.enum([
  'SELECIONADO',
  'AGUARDANDO_PAGAMENTO',
  'AGUARDANDO_ASSINATURA',
  'CONCLUIDO',
])
export type OwnerFairStatus = z.infer<typeof OwnerFairStatusSchema>

export const OwnerFairPaymentStatusSchema = z.enum([
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
])
export type OwnerFairPaymentStatus = z.infer<typeof OwnerFairPaymentStatusSchema>

export const StallSizeSchema = z.enum(['SIZE_2X2', 'SIZE_3X3', 'SIZE_3X6', 'TRAILER'])
export type StallSize = z.infer<typeof StallSizeSchema>

export const StallTypeSchema = z.enum(['OPEN', 'CLOSED', 'TRAILER'])
export type StallType = z.infer<typeof StallTypeSchema>

// ---------------------------
// Response: Purchases (linhas)
// ---------------------------

export const OwnerFairPurchaseInstallmentSchema = z.object({
  number: z.number().int().min(1),
  dueDate: z.string().min(1), // YYYY-MM-DD
  amountCents: z.number().int().min(0),

  paidAt: z.string().nullable(),
  paidAmountCents: z.number().int().min(0).nullable(),
})

export type OwnerFairPurchaseInstallment = z.infer<typeof OwnerFairPurchaseInstallmentSchema>

export const OwnerFairPurchaseSchema = z.object({
  id: z.string(),

  stallSize: StallSizeSchema,

  qty: z.number().int(), // backend (para o fluxo atual, será 1)
  usedQty: z.number().int(),

  unitPriceCents: z.number().int(),
  totalCents: z.number().int(),

  paidCents: z.number().int(),
  paidAt: z.string().nullable(), // YYYY-MM-DD | null

  installmentsCount: z.number().int(),
  status: OwnerFairPaymentStatusSchema,

  installments: z.array(OwnerFairPurchaseInstallmentSchema),
})

export type OwnerFairPurchase = z.infer<typeof OwnerFairPurchaseSchema>

// ---------------------------
// Response: Stalls vinculadas (portal)
// ---------------------------

export const InterestFairStallItemSchema = z.object({
  stallFairId: z.string(),
  stallId: z.string(),
  stallName: z.string(),

  stallSize: StallSizeSchema,
  stallType: StallTypeSchema,

  purchaseId: z.string(),
  purchase: z.object({
    id: z.string(),
    stallSize: StallSizeSchema,
    unitPriceCents: z.number().int(),
    qty: z.number().int(),
    usedQty: z.number().int(),
  }),

  createdAt: z.string(),
})

export type InterestFairStallItem = z.infer<typeof InterestFairStallItemSchema>

// ---------------------------
// Response: listagem de vínculos
// ---------------------------

export const InterestFairItemSchema = z.object({
  ownerFairId: z.string(),
  fairId: z.string(),
  fairName: z.string(),

  stallsQty: z.number().int(),
  status: OwnerFairStatusSchema,

  createdAt: z.string(),
  updatedAt: z.string(),

  purchases: z.array(OwnerFairPurchaseSchema),
  stalls: z.array(InterestFairStallItemSchema),
})

export const ListInterestFairsResponseSchema = z.object({
  ownerId: z.string(),
  items: z.array(InterestFairItemSchema),
})

export type InterestFairItem = z.infer<typeof InterestFairItemSchema>
export type ListInterestFairsResponse = z.infer<typeof ListInterestFairsResponseSchema>

// ---------------------------
// Inputs (mutations)
// ---------------------------

/**
 * Input de parcela (linha).
 * Observação:
 * - date-only (YYYY-MM-DD), igual ao backend.
 */
export const OwnerFairPurchaseInstallmentInputSchema = z.object({
  number: z.number().int().min(1),
  dueDate: z.string().min(1), // YYYY-MM-DD
  amountCents: z.number().int().min(0),

  paidAt: z.string().nullable().optional(),
  paidAmountCents: z.number().int().min(0).nullable().optional(),
})
export type OwnerFairPurchaseInstallmentInput = z.infer<
  typeof OwnerFairPurchaseInstallmentInputSchema
>

/**
 * Input de compra 1 por 1 (linha).
 * - Não possui qty e não possui totalCents: backend calcula (qty=1, total=unitPrice).
 */
export const OwnerFairPurchaseItemInputSchema = z.object({
  stallSize: StallSizeSchema,

  unitPriceCents: z.number().int().min(0),
  paidCents: z.number().int().min(0).optional().default(0),

  installmentsCount: z.number().int().min(0).max(12).optional().default(0),
  installments: z.array(OwnerFairPurchaseInstallmentInputSchema).optional().default([]),
})
export type OwnerFairPurchaseItemInput = z.infer<typeof OwnerFairPurchaseItemInputSchema>

/**
 * POST /interests/:ownerId/fairs
 * Agora cria o vínculo e já envia purchases (linhas).
 */
export const LinkInterestToFairInputSchema = z.object({
  fairId: z.string().min(1),
  purchases: z.array(OwnerFairPurchaseItemInputSchema).min(1),
})
export type LinkInterestToFairInput = z.infer<typeof LinkInterestToFairInputSchema>


export const PatchOwnerFairPurchasesInputSchema = z.object({
  purchases: z.array(OwnerFairPurchaseItemInputSchema).min(1),
})
export type PatchOwnerFairPurchasesInput = z.infer<typeof PatchOwnerFairPurchasesInputSchema>