/**
 * Camada de queries do TanStack Query para Interests.
 * Motivo: padronizar cache keys e facilitar invalidações futuras.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  grantPortalAccess,
  createPasswordResetToken,
} from "./interests.service"

import type { GrantPortalAccessPayload, InterestsFilters } from "./interests.schema"

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
    queryFn: () => grantSafeList(filters),
  })
}

/**
 * Separação pequena só pra manter o useQuery mais limpo
 * e facilitar interceptar erros no futuro.
 */
async function grantSafeList(filters: InterestsFilters) {
  const { listInterests } = await import("./interests.service")
  return listInterests(filters)
}

/**
 * Mutation para gerar link temporário de acesso ao portal.
 *
 * Decisão:
 * - Invalidamos a list atual para refletir mudanças futuras.
 * - Hoje `hasPortalLogin` não muda imediatamente (senha ainda não foi criada),
 *   mas manter a invalidação é seguro.
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

/**
 * Mutation para gerar token/link de reset de senha.
 *
 * Observação:
 * - Esse é o "atalho" de reset.
 * - Se você preferir, pode remover e usar grantPortalAccess com type=RESET_PASSWORD.
 */
export function useCreatePasswordResetTokenMutation(filtersToInvalidate: InterestsFilters) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (args: { ownerId: string }) => createPasswordResetToken(args.ownerId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestsQueryKeys.list(filtersToInvalidate) })
    },
  })
}
