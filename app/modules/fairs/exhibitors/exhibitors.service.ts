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
} from "./exhibitors.schema"

/**
 * GET /fairs/:fairId/exhibitors
 * Responsabilidade:
 * - Buscar a lista da tela “Barracas vinculadas”
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
 * - Marcar ou desmarcar parcelas como pagas.
 *
 * Contrato:
 * - action: "SET_PAID" | "SET_UNPAID"
 * - payAll=true OU numbers=[...]
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
