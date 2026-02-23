import { api } from "@/app/shared/http/api"
import {
  SettleInstallmentsInputSchema,
  type SettleInstallmentsInput,
  SettleInstallmentsResponseSchema,
  type SettleInstallmentsResponse,

  RescheduleInstallmentInputSchema,
  type RescheduleInstallmentInput,

  CreateInstallmentPaymentInputSchema,
  type CreateInstallmentPaymentInput,

  InstallmentPaymentActionResponseSchema,
  type InstallmentPaymentActionResponse,

  CreatePurchaseAdjustmentInputSchema,
  type CreatePurchaseAdjustmentInput,
  CreatePurchaseAdjustmentResponseSchema,
  type CreatePurchaseAdjustmentResponse,
} from "./owner-fair-purchases.schema"

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/payment/installments/settle
 * ✅ Mantém o mesmo nome antigo
 */
export async function settleFairExhibitorInstallments(params: {
  fairId: string
  ownerId: string
  input: SettleInstallmentsInput
}): Promise<SettleInstallmentsResponse> {
  const input = SettleInstallmentsInputSchema.parse(params.input)

  const data = await api.patch(
    `fairs/${params.fairId}/exhibitors/${params.ownerId}/payment/installments/settle`,
    input,
  )

  return SettleInstallmentsResponseSchema.parse(data)
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/purchases/:purchaseId/installments/:number/reschedule
 * ✅ Mantém o mesmo nome antigo
 */
export async function reschedulePurchaseInstallment(params: {
  fairId: string
  ownerId: string
  purchaseId: string
  installmentNumber: number
  input: RescheduleInstallmentInput
}): Promise<InstallmentPaymentActionResponse> {
  const input = RescheduleInstallmentInputSchema.parse(params.input)

  const data = await api.patch(
    `fairs/${params.fairId}/exhibitors/${params.ownerId}/purchases/${params.purchaseId}/installments/${params.installmentNumber}/reschedule`,
    input,
  )

  return InstallmentPaymentActionResponseSchema.parse(data)
}

/**
 * POST /fairs/:fairId/exhibitors/:ownerId/purchases/:purchaseId/installments/:number/payments
 * ✅ Mantém o mesmo nome antigo
 */
export async function createInstallmentPayment(params: {
  fairId: string
  ownerId: string
  purchaseId: string
  installmentNumber: number
  input: CreateInstallmentPaymentInput
}): Promise<InstallmentPaymentActionResponse> {
  const input = CreateInstallmentPaymentInputSchema.parse(params.input)

  const data = await api.post(
    `fairs/${params.fairId}/exhibitors/${params.ownerId}/purchases/${params.purchaseId}/installments/${params.installmentNumber}/payments`,
    input,
  )

  return InstallmentPaymentActionResponseSchema.parse(data)
}

/**
 * ✅ NOVO (desconto/acréscimo)
 * POST /fairs/:fairId/exhibitors/:ownerId/purchases/:purchaseId/adjustments
 */
export async function createPurchaseAdjustment(params: {
  fairId: string
  ownerId: string
  purchaseId: string
  input: CreatePurchaseAdjustmentInput
}): Promise<CreatePurchaseAdjustmentResponse> {
  const input = CreatePurchaseAdjustmentInputSchema.parse(params.input)

  const data = await api.post(
    `fairs/${params.fairId}/exhibitors/${params.ownerId}/purchases/${params.purchaseId}/adjustments`,
    input,
  )

  return CreatePurchaseAdjustmentResponseSchema.parse(data)
}