import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listFairExhibitors,
  updateFairExhibitorStatus,

  // ✅ NOVO
  updateFairExhibitorObservations,
} from "./exhibitors.service"

import type {
  OwnerFairStatus,

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
