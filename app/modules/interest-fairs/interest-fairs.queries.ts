/**
 * Queries e mutations do módulo InterestFairs.
 * Responsável por:
 * - cache
 * - invalidação após create/update/delete
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  linkInterestToFair,
  listInterestFairs,
  unlinkInterestFromFair,
  updateInterestFair,
} from "./interest-fairs.service"
import type { LinkInterestToFairInput, UpdateInterestFairInput } from "./types"

function interestFairsKey(ownerId: string) {
  return ["interest-fairs", ownerId] as const
}

export function useInterestFairsQuery(ownerId?: string) {
  return useQuery({
    queryKey: ownerId ? interestFairsKey(ownerId) : ["interest-fairs", "no-owner"],
    enabled: Boolean(ownerId),
    queryFn: async () => listInterestFairs(ownerId!),
  })
}

export function useLinkInterestToFairMutation(ownerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: LinkInterestToFairInput) => linkInterestToFair(ownerId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) })
    },
  })
}

export function useUpdateInterestFairMutation(ownerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (args: { fairId: string; input: UpdateInterestFairInput }) =>
      updateInterestFair(ownerId, args.fairId, args.input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) })
    },
  })
}

export function useUnlinkInterestFromFairMutation(ownerId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (fairId: string) => unlinkInterestFromFair(ownerId, fairId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) })
    },
  })
}
