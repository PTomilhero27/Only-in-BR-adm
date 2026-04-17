// app/modules/marketplace/marketplace.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketplaceService } from "./marketplace.service";
import type {
  ConfirmMarketplaceReservationInput,
  MarketplaceInterestStatus,
  MarketplaceSlotStatus,
  NotifyMissingStallInput,
} from "./marketplace.schema";
import { fairMapsQueryKeys } from "../fair-maps/fair-maps.queries";
import { fairExhibitorsQueryKeys } from "../fairs/exhibitors/exhibitors.queries";

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

export function useUpdateSlotTentTypesMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      slotId: string;
      configurations: Array<{ tentType: string; priceCents: number }>;
    }) => marketplaceService.updateSlotTentTypes(args.slotId, args.configurations),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fairMapsQueryKeys.byFairId(fairId) });
      qc.invalidateQueries({ queryKey: marketplaceKeys.reservations(fairId) });
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

export function useConfirmMarketplaceReservationMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      reservationId: string;
      input: ConfirmMarketplaceReservationInput;
    }) => marketplaceService.confirmReservation(args.reservationId, args.input),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: marketplaceKeys.reservations(fairId),
      });
      await qc.invalidateQueries({
        queryKey: marketplaceKeys.interests(fairId),
      });
      await qc.invalidateQueries({
        queryKey: fairMapsQueryKeys.byFairId(fairId),
      });
      await qc.invalidateQueries({
        queryKey: fairMapsQueryKeys.availableStallFairs(fairId),
      });
      await qc.invalidateQueries({
        queryKey: fairExhibitorsQueryKeys.list(fairId),
      });
    },
  });
}

export function useNotifyMissingStallMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      reservationId: string;
      input: NotifyMissingStallInput;
    }) => marketplaceService.notifyMissingStall(args.reservationId, args.input),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: marketplaceKeys.reservations(fairId),
      });
      await qc.invalidateQueries({
        queryKey: fairMapsQueryKeys.byFairId(fairId),
      });
    },
  });
}
