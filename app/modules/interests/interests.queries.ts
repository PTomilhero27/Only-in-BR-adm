/**
 * Camada de queries do TanStack Query para Interests.
 * Motivo: padronizar cache keys e facilitar invalidações futuras.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { grantPortalAccess, listInterests, type GrantPortalAccessPayload } from "./interests.service"
import type { InterestsFilters } from "./interests.schema"

/**
 * Cache keys centralizadas do módulo.
 * Motivo: evitar invalidação errada e facilitar expansão futura.
 */
export const interestsQueryKeys = {
  all: ["interests"] as const,
  list: (filters: InterestsFilters) => ["interests", "list", filters] as const,

  /**
   * Chave auxiliar para ações por interessado (útil no futuro).
   * Ex.: detalhes, histórico, auditoria, etc.
   */
  byId: (ownerId: string) => ["interests", "byId", ownerId] as const,
}

export function useInterestsListQuery(filters: InterestsFilters) {
  return useQuery({
    queryKey: interestsQueryKeys.list(filters),
    queryFn: () => listInterests(filters),
  })
}

/**
 * Mutation para gerar link temporário de acesso ao portal.
 *
 * Decisão:
 * - Por padrão, invalidamos a list atual para permitir que o modal/tabela reflita mudanças futuras.
 * - Hoje `hasPortalLogin` não muda imediatamente (senha ainda não foi criada), mas manter a invalidação é seguro.
 */
export function useGrantPortalAccessMutation(filtersToInvalidate: InterestsFilters) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (args: { ownerId: string; payload?: GrantPortalAccessPayload }) =>
      grantPortalAccess(args.ownerId, args.payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestsQueryKeys.list(filtersToInvalidate) })
    },
  })
}
