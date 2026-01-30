/**
 * React Query do módulo Fairs.
 * Responsabilidade:
 * - Expor hooks para criar/editar e manter cache consistente.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFair, updateFair } from "./fairs.service";
import { CreateFairRequest, UpdateFairRequest } from "./fairs.schemas";

export const fairsQueryKey = ["fairs"];

export function useCreateFairMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFairRequest) => createFair(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: fairsQueryKey });
    },
  });
}

export function useUpdateFairMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; payload: UpdateFairRequest }) =>
      updateFair(args.id, args.payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: fairsQueryKey });
    },
  });
}
