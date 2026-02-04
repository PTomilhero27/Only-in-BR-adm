/**
 * Camada TanStack Query para Expositores da Feira (Admin).
 * Motivo: padronizar cache keys e facilitar invalidações.
 *
 * Atualização (novo financeiro por compra):
 * - Mantemos query de listagem
 * - Mantemos mutation de status
 * - Mantemos mutation "settle" (atalho) agora por purchaseId
 * - Adicionamos:
 *   - mutation para registrar pagamento parcial (histórico)
 *   - mutation para reprogramar vencimento
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listFairExhibitors,
  updateFairExhibitorStatus,
  settleFairExhibitorInstallments,
  createInstallmentPayment,
  reschedulePurchaseInstallment,
} from "./exhibitors.service"
import type {
  OwnerFairStatus,
  SettleInstallmentsInput,
  CreateInstallmentPaymentInput,
  RescheduleInstallmentInput,
} from "./exhibitors.schema"

export const fairExhibitorsQueryKeys = {
  all: ["fairs", "exhibitors"] as const,
  list: (fairId: string) => ["fairs", "exhibitors", "list", { fairId }] as const,
}

/**
 * GET /fairs/:fairId/exhibitors
 */
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
 * - Atalho para baixar/desfazer parcelas de UMA compra (purchaseId).
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

/**
 * POST /fairs/:fairId/exhibitors/:ownerId/purchases/:purchaseId/installments/:number/payments
 * Responsabilidade:
 * - Registrar pagamento parcial (histórico) em uma parcela.
 */
export function useCreateInstallmentPaymentMutation(fairId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: {
      ownerId: string
      purchaseId: string
      installmentNumber: number
      input: CreateInstallmentPaymentInput
    }) =>
      createInstallmentPayment({
        fairId,
        ownerId: vars.ownerId,
        purchaseId: vars.purchaseId,
        installmentNumber: vars.installmentNumber,
        input: vars.input,
      }),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: fairExhibitorsQueryKeys.list(fairId) })
    },
  })
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/purchases/:purchaseId/installments/:number/reschedule
 * Responsabilidade:
 * - Reprogramar vencimento (dueDate) de uma parcela.
 */
export function useRescheduleInstallmentMutation(fairId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: {
      ownerId: string
      purchaseId: string
      installmentNumber: number
      input: RescheduleInstallmentInput
    }) =>
      reschedulePurchaseInstallment({
        fairId,
        ownerId: vars.ownerId,
        purchaseId: vars.purchaseId,
        installmentNumber: vars.installmentNumber,
        input: vars.input,
      }),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: fairExhibitorsQueryKeys.list(fairId) })
    },
  })
}
