// src/modules/fair-maps/fair-maps.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fairMapsService } from "./fair-maps.service";
import type {
  LinkBoothSlotInput,
  SetFairMapTemplateInput,
} from "./fair-maps.schema";

export const fairMapsQueryKeys = {
  all: ["fair-maps"] as const,

  byFairId: (fairId: string) =>
    [...fairMapsQueryKeys.all, "fair", fairId] as const,

  availableStallFairs: (fairId: string) =>
    [...fairMapsQueryKeys.byFairId(fairId), "available-stall-fairs"] as const,
};

export function useFairMapQuery(fairId: string) {
  return useQuery({
    queryKey: fairMapsQueryKeys.byFairId(fairId),
    queryFn: () => fairMapsService.getByFairId(fairId),
    enabled: Boolean(fairId),
    staleTime: 10_000,
  });
}

export function useSetFairMapTemplateMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: SetFairMapTemplateInput) =>
      fairMapsService.setTemplate(fairId, input),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: fairMapsQueryKeys.byFairId(fairId),
      });
    },
  });
}

export function useLinkBoothSlotMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      slotClientKey: string;
      input: LinkBoothSlotInput;
    }) =>
      fairMapsService.linkSlot(
        fairId,
        args.slotClientKey,
        args.input,
      ),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: fairMapsQueryKeys.byFairId(fairId),
      });

      qc.invalidateQueries({
        queryKey: fairMapsQueryKeys.availableStallFairs(fairId),
      });
    },
  });
}

/**
 * ✅ Hook novo para autocomplete do modal
 */
export function useAvailableStallFairsQuery(
  fairId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: fairMapsQueryKeys.availableStallFairs(fairId),
    queryFn: () =>
      fairMapsService.listAvailableStallFairs(fairId),
    enabled,
    staleTime: 10_000,
  });
}