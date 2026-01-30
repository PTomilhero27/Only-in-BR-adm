/**
 * Camada TanStack Query para Expositores da Feira.
 * Motivo: padronizar cache keys e facilitar invalidações.
 *
 * Nesta etapa:
 * - Mantemos query de listagem
 * - Mantemos mutation de status
 * - Adicionamos mutation para baixar/desfazer parcelas (settle)
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listFairExhibitors,
  updateFairExhibitorStatus,
  settleFairExhibitorInstallments,
} from "./exhibitors.service"
import type { OwnerFairStatus, SettleInstallmentsInput } from "./exhibitors.schema"

export const fairExhibitorsQueryKeys = {
  all: ["fairs", "exhibitors"] as const,
  list: (fairId: string) => ["fairs", "exhibitors", "list", { fairId }] as const,
}

export function useFairExhibitorsQuery(fairId: string) {
  return useQuery({
    queryKey: fairExhibitorsQueryKeys.list(fairId),
    queryFn: () => listFairExhibitors(fairId),
    enabled: !!fairId,
  })
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/status
 * Invalida a lista da feira para refletir o status atualizado na tabela.
 */
export function useUpdateFairExhibitorStatusMutation(fairId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { ownerId: string; status: OwnerFairStatus }) =>
      updateFairExhibitorStatus({
        fairId,
        ownerId: vars.ownerId,
        input: { status: vars.status },
      }),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: fairExhibitorsQueryKeys.list(fairId) })
    },
  })
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/payment/installments/settle
 * Responsabilidade:
 * - Baixar/desfazer parcelas e refletir na tabela.
 *
 * Decisão:
 * - Sempre invalidar a listagem depois (backend é fonte de verdade).
 */
export function useSettleInstallmentsMutation(fairId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { ownerId: string; input: SettleInstallmentsInput }) =>
      settleFairExhibitorInstallments({
        fairId,
        ownerId: vars.ownerId,
        input: vars.input,
      }),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: fairExhibitorsQueryKeys.list(fairId) })
    },
  })
}
