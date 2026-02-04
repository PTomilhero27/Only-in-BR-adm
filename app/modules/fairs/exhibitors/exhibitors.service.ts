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
} from "./exhibitors.schema"

/**
 * GET /fairs/:fairId/exhibitors
 * Responsabilidade:
 * - Buscar a lista da tela de expositores da feira (Admin)
 * - Validar via Zod para evitar contrato implícito
 */
export async function listFairExhibitors(fairId: string): Promise<FairExhibitorsResponse> {
  return api.get(`fairs/${fairId}/exhibitors`, FairExhibitorsResponseSchema)
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/status
 * Responsabilidade:
 * - Atualizar o status operacional do expositor na feira
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
 * PATCH /fairs/:fairId/exhibitors/:ownerId/payment/installments/settle
 * Responsabilidade:
 * - Atalho de baixar/desfazer parcelas de UMA compra (purchaseId).
 *
 * Contrato:
 * - purchaseId obrigatório
 * - action: SET_PAID | SET_UNPAID
 * - payAll=true OU numbers=[...]
 * - paidAt: YYYY-MM-DD (date-only)
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
 * Responsabilidade:
 * - Reprogramar vencimento (dueDate) de 1 parcela específica
 * - Registrar auditoria no backend
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
 * Responsabilidade:
 * - Registrar um pagamento no histórico (suporta pagamento parcial)
 * - Backend recalcula caches e status da compra
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
