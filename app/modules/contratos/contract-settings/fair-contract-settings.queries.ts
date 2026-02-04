/**
 * Feiras > Contract Settings (TanStack Query)
 *
 * Responsabilidade:
 * - Mutation para vincular/trocar contrato da feira.
 * - Invalidação segura para atualizar a UI que consome `useFairExhibitorsQuery(fairId)`.
 *
 * Observação:
 * - Como o key exato de `useFairExhibitorsQuery` pode variar, invalidamos pelo prefixo
 *   ["fairs","exhibitors"] (seguro e simples).
 * - Depois refinamos para invalidar só a feira específica se você quiser.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UpsertFairContractSettingsInput } from "./fair-contract-settings.schema"
import { upsertFairContractSettings } from "./fair-contract-settings.service"

export const fairContractSettingsQueryKeys = {
  all: ["fairs", "contract-settings"] as const,
}

export function useUpsertFairContractSettingsMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { fairId: string; input: UpsertFairContractSettingsInput }) =>
      upsertFairContractSettings({ fairId: vars.fairId, input: vars.input }),

    onSettled: async () => {
      // ✅ Atualiza o card na tela de "Barracas vinculadas"
      await qc.invalidateQueries({ queryKey: ["fairs", "exhibitors"] })
    },
  })
}
