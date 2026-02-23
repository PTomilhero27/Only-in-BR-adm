import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  settleFairExhibitorInstallments,
  createInstallmentPayment,
  reschedulePurchaseInstallment,
  createPurchaseAdjustment,
} from "./owner-fair-purchases.service"

import type {
  SettleInstallmentsInput,
  CreateInstallmentPaymentInput,
  RescheduleInstallmentInput,
  CreatePurchaseAdjustmentInput,
} from "./owner-fair-purchases.schema"

/**
 * Importante:
 * - para invalidar, o módulo precisa saber a queryKey do módulo de expositores.
 * - mantemos dependência leve (só da key), sem importar service/schema de lá.
 */
export const fairExhibitorsQueryKeys = {
  list: (fairId: string) => ["fairs", "exhibitors", "list", { fairId }] as const,
}

/**
 * PATCH /fairs/:fairId/exhibitors/:ownerId/payment/installments/settle
 * ✅ mesmo nome antigo
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
 * ✅ mesmo nome antigo
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
 * ✅ mesmo nome antigo
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

/**
 * ✅ NOVO: desconto/acréscimo
 */
export function useCreatePurchaseAdjustmentMutation(fairId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: {
      ownerId: string
      purchaseId: string
      input: CreatePurchaseAdjustmentInput
    }) =>
      createPurchaseAdjustment({
        fairId,
        ownerId: vars.ownerId,
        purchaseId: vars.purchaseId,
        input: vars.input,
      }),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: fairExhibitorsQueryKeys.list(fairId) })
    },
  })
}