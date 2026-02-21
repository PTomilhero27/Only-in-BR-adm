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
 * Utilitário interno:
 * - Centraliza como exibimos erros de parse (Zod) com contexto.
 * - Ajuda MUITO quando "não aparece nada na tela" por mismatch de schema.
 */
function buildZodErrorMessage(params: {
  label: string
  url: string
  error: unknown
  data?: unknown
}) {
  const { label, url, error, data } = params

  const err = error as any
  const issues = err?.issues ?? err?.errors ?? null

  const header = `[${label}] Falha ao validar resposta do backend (Zod).`
  const details = issues ? `\nIssues:\n${JSON.stringify(issues, null, 2)}` : ""
  const payload = data ? `\nPayload (resumo):\n${JSON.stringify(data, null, 2)}` : ""

  return `${header}\nURL: ${url}${details}${payload}`
}

/**
 * GET /fairs/:fairId/exhibitors
 */
export async function listFairExhibitors(
  fairId: string,
): Promise<FairExhibitorsResponse> {
  const url = `fairs/${fairId}/exhibitors`

  /**
   * Observação importante:
   * - Chamamos api.get "cru" (sem schema) para conseguir logar o payload real caso o Zod quebre.
   * - Depois validamos com Zod manualmente.
   *
   * Isso evita o problema clássico:
   * "não aparece nada" porque a validação quebra e a UI só recebe isError sem detalhes.
   */
  const data = await api.get(url)

  // ✅ Debug opcional (somente em desenvolvimento)
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[listFairExhibitors] raw payload =", data)
  }

  try {
    return FairExhibitorsResponseSchema.parse(data)
  } catch (err) {
    const message = buildZodErrorMessage({
      label: "listFairExhibitors",
      url,
      error: err,
      data,
    })

    // eslint-disable-next-line no-console
    console.error(message)

    /**
     * Lançamos um erro "legível" para o React Query.
     * A página vai renderizar esse erro no <pre>.
     */
    throw new Error(message)
  }
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