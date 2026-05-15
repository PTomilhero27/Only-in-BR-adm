/**
 * Contratos > Contracts (TanStack Query)
 *
 * Responsabilidade:
 * - Padronizar cache keys para contratos multi-tipo.
 * - Hooks de query/mutation com invalidação consistente.
 *
 * Decisão:
 * - Ao criar/excluir contrato, invalidamos também as queries de exhibitors
 *   (pois o campo `allContracts` e `instance` mudam na resposta da feira).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CreateContractInput, AddFairLinkInput } from "./contracts.schema"
import {
  createContract,
  listContractsByFair,
  listContractsByOwner,
  getContractById,
  addFairLink,
  removeFairLink,
  deleteContract,
} from "./contracts.service"

export const contractsQueryKeys = {
  all: ["contracts", "instances"] as const,
  byFair: (fairId: string) => ["contracts", "instances", "byFair", { fairId }] as const,
  byOwner: (ownerId: string) => ["contracts", "instances", "byOwner", { ownerId }] as const,
  byId: (id: string) => ["contracts", "instances", "byId", { id }] as const,
}

/**
 * GET /contracts/fair/:fairId
 */
export function useContractsByFairQuery(fairId: string) {
  return useQuery({
    queryKey: contractsQueryKeys.byFair(fairId),
    queryFn: () => listContractsByFair(fairId),
    enabled: !!fairId,
  })
}

/**
 * GET /contracts/owner/:ownerId
 */
export function useContractsByOwnerQuery(ownerId: string) {
  return useQuery({
    queryKey: contractsQueryKeys.byOwner(ownerId),
    queryFn: () => listContractsByOwner(ownerId),
    enabled: !!ownerId,
  })
}

/**
 * GET /contracts/:id
 */
export function useContractDetailQuery(id: string) {
  return useQuery({
    queryKey: contractsQueryKeys.byId(id),
    queryFn: () => getContractById(id),
    enabled: !!id,
  })
}

/**
 * POST /contracts
 */
export function useCreateContractMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateContractInput) => createContract(input),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: contractsQueryKeys.all })
      // Atualiza a tabela de expositores (campo allContracts/instance)
      await qc.invalidateQueries({ queryKey: ["fairs", "exhibitors"] })
    },
  })
}

/**
 * POST /contracts/:id/fair-links
 */
export function useAddFairLinkMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { contractId: string; input: AddFairLinkInput }) =>
      addFairLink(vars.contractId, vars.input),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: contractsQueryKeys.all })
    },
  })
}

/**
 * DELETE /contracts/:id/fair-links/:fairId
 */
export function useRemoveFairLinkMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { contractId: string; fairId: string }) =>
      removeFairLink(vars.contractId, vars.fairId),

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: contractsQueryKeys.all })
    },
  })
}

/**
 * DELETE /contracts/:id
 */
export function useDeleteContractMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteContract(id),

    onSettled: async (_data, _err, id) => {
      await qc.invalidateQueries({ queryKey: contractsQueryKeys.all })
      await qc.invalidateQueries({ queryKey: ["fairs", "exhibitors"] })

      if (id) {
        qc.removeQueries({ queryKey: contractsQueryKeys.byId(id) })
      }
    },
  })
}
