// app/modules/marketplace/marketplace.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketplaceService } from "./marketplace.service";
import type {
  MarketplaceInterestStatus,
  MarketplaceSlotStatus,
} from "./marketplace.schema";
import { fairMapsQueryKeys } from "../fair-maps/fair-maps.queries";

export const marketplaceKeys = {
  all: ["marketplace"] as const,

  interests: (fairId: string) =>
    [...marketplaceKeys.all, "interests", fairId] as const,

  reservations: (fairId: string) =>
    [...marketplaceKeys.all, "reservations", fairId] as const,
};

// ───────────────────────── Queries ─────────────────────────

export function useMarketplaceInterestsQuery(fairId: string, enabled = true) {
  return useQuery({
    queryKey: marketplaceKeys.interests(fairId),
    queryFn: () => marketplaceService.listInterests(fairId),
    enabled: Boolean(fairId) && enabled,
    staleTime: 10_000,
  });
}

export function useMarketplaceReservationsQuery(fairId: string, enabled = true) {
  return useQuery({
    queryKey: marketplaceKeys.reservations(fairId),
    queryFn: () => marketplaceService.listReservations(fairId),
    enabled: Boolean(fairId) && enabled,
    staleTime: 10_000,
  });
}

// ───────────────────────── Mutations ─────────────────────────

export function useUpdateSlotPriceMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: { slotId: string; priceCents: number }) =>
      marketplaceService.updateSlotPrice(args.slotId, args.priceCents),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fairMapsQueryKeys.byFairId(fairId) });
    },
  });
}

export function useUpdateSlotStatusMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: { slotId: string; status: MarketplaceSlotStatus }) =>
      marketplaceService.updateSlotStatus(args.slotId, args.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fairMapsQueryKeys.byFairId(fairId) });
      qc.invalidateQueries({ queryKey: marketplaceKeys.interests(fairId) });
      qc.invalidateQueries({ queryKey: marketplaceKeys.reservations(fairId) });
    },
  });
}

export function useBlockSlotMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => marketplaceService.blockSlot(slotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fairMapsQueryKeys.byFairId(fairId) });
    },
  });
}

export function useUnblockSlotMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => marketplaceService.unblockSlot(slotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fairMapsQueryKeys.byFairId(fairId) });
    },
  });
}

export function useUpdateInterestStatusMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      interestId: string;
      status: MarketplaceInterestStatus;
      expiresAt?: string | null;
    }) =>
      marketplaceService.updateInterestStatus(
        args.interestId,
        args.status,
        args.expiresAt,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketplaceKeys.interests(fairId) });
      qc.invalidateQueries({ queryKey: marketplaceKeys.reservations(fairId) });
      qc.invalidateQueries({ queryKey: fairMapsQueryKeys.byFairId(fairId) });
    },
  });
}
