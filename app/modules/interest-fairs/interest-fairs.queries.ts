'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  linkInterestToFair,
  listInterestFairs,
  patchOwnerFairPurchases,
  unlinkInterestFromFair,
} from './interest-fairs.service'
import type { LinkInterestToFairInput, PatchOwnerFairPurchasesInput } from './interest-fairs.schema'

function interestFairsKey(ownerId: string) {
  return ['interest-fairs', ownerId] as const
}

/**
 * Consulta os vínculos do Owner com feiras + compras + barracas vinculadas.
 * Esse endpoint é a fonte de verdade para o modal de detalhes do interessado.
 */
export function useInterestFairsQuery(ownerId?: string) {
  return useQuery({
    queryKey: ownerId ? interestFairsKey(ownerId) : ['interest-fairs', 'no-owner'],
    enabled: Boolean(ownerId),
    queryFn: async () => listInterestFairs(ownerId!),
  })
}

/**
 * Cria vínculo Owner↔Fair já registrando as compras (linhas 1 por 1).
 * - Endpoint: POST /interests/:ownerId/fairs
 * - Body: { fairId, purchases: [...] }
 */
export function useLinkInterestToFairMutation(ownerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: useLinkInterestToFairMutation.Input) =>
      linkInterestToFair(ownerId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) })
    },
  })
}
export namespace useLinkInterestToFairMutation {
  export type Input = LinkInterestToFairInput
}

/**
 * Remove vínculo Owner↔Fair.
 * Observação:
 * - O backend bloqueia remoção se já houver StallFair vinculado.
 */
export function useUnlinkInterestFromFairMutation(ownerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (fairId: string) => unlinkInterestFromFair(ownerId, fairId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) })
    },
  })
}

export function usePatchOwnerFairPurchasesMutation(ownerId: string, fairId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: PatchOwnerFairPurchasesInput) =>
      patchOwnerFairPurchases(ownerId, fairId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) })
    },
  })
}