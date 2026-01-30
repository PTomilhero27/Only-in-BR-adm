import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fairFormsService } from "./fair-forms.service"
import type { UpsertFairFormPayload } from "./fair-forms.types"

/**
 * Queries/mutations do módulo FairForms.
 * Mantém cache consistente por feira.
 */

export function fairFormsKeys() {
  return {
    all: ["fairForms"] as const,
    byFair: (fairId: string) => ["fairForms", "byFair", fairId] as const,
  }
}

export function useFairFormsByFairQuery(fairId: string) {
  return useQuery({
    queryKey: fairFormsKeys().byFair(fairId),
    queryFn: () => fairFormsService.listByFairId(fairId),
    enabled: !!fairId,
  })
}

export function useUpsertFairFormMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (args: { fairId: string; slug: string; payload: UpsertFairFormPayload }) =>
      fairFormsService.upsertByFairIdAndSlug(args),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: fairFormsKeys().byFair(vars.fairId) })
    },
  })
}
