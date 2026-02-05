import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listFairExhibitors,
  updateFairExhibitorStatus,
  settleFairExhibitorInstallments,
  createInstallmentPayment,
  reschedulePurchaseInstallment,

  // ✅ NOVO
  updateFairExhibitorObservations,
} from "./exhibitors.service"

import type {
  OwnerFairStatus,
  SettleInstallmentsInput,
  CreateInstallmentPaymentInput,
  RescheduleInstallmentInput,

  // ✅ NOVO
  UpdateExhibitorObservationsInput,
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
 * ✅ PATCH /fairs/:fairId/exhibitors/:ownerId/observations
 * Observação:
 * - Sempre invalidamos a listagem, pois ela contém row.observations.
 */
export function useUpdateFairExhibitorObservationsMutation(fairId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { ownerId: string; input: UpdateExhibitorObservationsInput }) =>
      updateFairExhibitorObservations({
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
 * PATCH /fairs/:fairId/exhibitors/:ownerId/payment/installments/settle
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
