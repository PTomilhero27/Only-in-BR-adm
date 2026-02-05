import { api } from "@/app/shared/http/api"
import {
  FairExhibitorsResponseSchema,
  type FairExhibitorsResponse,

  UpdateExhibitorStatusInputSchema,
  type UpdateExhibitorStatusInput,
  UpdateExhibitorStatusResponseSchema,
  type UpdateExhibitorStatusResponse,

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

  // ✅ NOVO
  UpdateExhibitorObservationsInputSchema,
  type UpdateExhibitorObservationsInput,
  UpdateExhibitorObservationsResponseSchema,
  type UpdateExhibitorObservationsResponse,
} from "./exhibitors.schema"

/**
 * GET /fairs/:fairId/exhibitors
 */
export async function listFairExhibitors(fairId: string): Promise<FairExhibitorsResponse> {
  return api.get(`fairs/${fairId}/exhibitors`, FairExhibitorsResponseSchema)
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/status
 */
export async function updateFairExhibitorStatus(params: {
  fairId: string
  ownerId: string
  input: UpdateExhibitorStatusInput
}): Promise<UpdateExhibitorStatusResponse> {
  const input = UpdateExhibitorStatusInputSchema.parse(params.input)

  const data = await api.patch(
    `fairs/${params.fairId}/exhibitors/${params.ownerId}/status`,
    input,
  )

  return UpdateExhibitorStatusResponseSchema.parse(data)
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/observations
 * ✅ Padronizado para retorno { ownerFair: {...} }
 */
export async function updateFairExhibitorObservations(params: {
  fairId: string
  ownerId: string
  input: UpdateExhibitorObservationsInput
}): Promise<UpdateExhibitorObservationsResponse> {
  const input = UpdateExhibitorObservationsInputSchema.parse(params.input)

  const data = await api.patch(
    `fairs/${params.fairId}/exhibitors/${params.ownerId}/observations`,
    input,
  )

  const normalized =
    data && typeof data === "object" && "ownerFair" in (data as any)
      ? data
      : { ownerFair: data }

  return UpdateExhibitorObservationsResponseSchema.parse(normalized)
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/payment/installments/settle
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
