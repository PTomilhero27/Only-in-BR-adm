import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPixRemittance, listPixRemittances, redoPixRemittance } from "./pix-remittances.service";
import { fairSuppliersQueryKeys } from "../fair-suppliers/fair-suppliers.queries";

export const pixRemittancesQueryKeys = {
  all: ["fairs", "pix-remittances"] as const,
  list: (fairId: string) => ["fairs", "pix-remittances", "list", { fairId }] as const,
};

async function invalidatePixRemittanceSideEffects(
  queryClient: ReturnType<typeof useQueryClient>,
  fairId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: fairSuppliersQueryKeys.list(fairId) }),
    queryClient.invalidateQueries({ queryKey: pixRemittancesQueryKeys.list(fairId) }),
    queryClient.invalidateQueries({ queryKey: ["fairs", "payable-items", { fairId }] }),
    queryClient.invalidateQueries({ queryKey: ["payable-items", { fairId }] }),
  ]);
}

/**
 * Mutation para criar remessas PIX.
 * O toast de sucesso/erro é controlado pelo dialog que chama esta mutation,
 * pois o fluxo de download acontece após a resposta do backend.
 */
export function useCreatePixRemittanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPixRemittance,
    onSuccess: async (_, variables) => {
      // Invalida a lista de fornecedores para refletir os novos status das parcelas
      await invalidatePixRemittanceSideEffects(queryClient, variables.fairId);
    },
  });
}

export function usePixRemittancesQuery(fairId: string) {
  return useQuery({
    queryKey: pixRemittancesQueryKeys.list(fairId),
    queryFn: () => listPixRemittances(fairId),
    enabled: !!fairId,
  });
}

export function useRedoPixRemittanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: redoPixRemittance,
    onSuccess: async (_, variables) => {
      await invalidatePixRemittanceSideEffects(queryClient, variables.fairId);
    },
  });
}
