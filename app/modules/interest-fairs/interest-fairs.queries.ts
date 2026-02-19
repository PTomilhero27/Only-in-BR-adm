/* eslint-disable @typescript-eslint/no-namespace */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  linkInterestToFair,
  listInterestFairs,
  patchOwnerFairPurchases,
  patchStallFairTax,
  unlinkInterestFromFair,
} from "./interest-fairs.service";

import type {
  LinkInterestToFairInput,
  PatchOwnerFairPurchasesInput,
} from "./interest-fairs.schema";

// ✅ IMPORTANTE: usar as queryKeys oficiais da tela de expositores
import { fairExhibitorsQueryKeys } from "@/app/modules/fairs/exhibitors/exhibitors.queries";

/**
 * ✅ Query Keys
 */
export function interestFairsKey(ownerId: string) {
  return ["interest-fairs", ownerId] as const;
}

/**
 * ✅ Consulta os vínculos do Owner com feiras + compras + barracas vinculadas.
 */
export function useInterestFairsQuery(ownerId?: string) {
  return useQuery({
    queryKey: ownerId
      ? interestFairsKey(ownerId)
      : ["interest-fairs", "no-owner"],
    enabled: Boolean(ownerId),
    queryFn: async () => listInterestFairs(ownerId!),
  });
}

/**
 * ✅ POST /interests/:ownerId/fairs
 */
export function useLinkInterestToFairMutation(ownerId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: useLinkInterestToFairMutation.Input) =>
      linkInterestToFair(ownerId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) });
    },
  });
}
export namespace useLinkInterestToFairMutation {
  export type Input = LinkInterestToFairInput;
}

/**
 * ✅ DELETE /interests/:ownerId/fairs/:fairId
 */
export function useUnlinkInterestFromFairMutation(ownerId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (fairId: string) =>
      unlinkInterestFromFair(ownerId, fairId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) });
    },
  });
}

/**
 * ✅ PATCH /interests/:ownerId/fairs/:fairId/purchases
 */
export function usePatchOwnerFairPurchasesMutation(
  ownerId: string,
  fairId: string,
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: PatchOwnerFairPurchasesInput) =>
      patchOwnerFairPurchases(ownerId, fairId, input),
    onSuccess: async () => {
      // modal do interessado
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) });
      // tela de expositores (porque stallsQty/status/pagamentos podem mudar)
      await qc.invalidateQueries({
        queryKey: fairExhibitorsQueryKeys.list(fairId),
      });
    },
  });
}

/**
 * ✅ PATCH /interests/:ownerId/fairs/:fairId/stalls/:stallFairId/tax
 * Body: { taxId }
 *
 * Importante:
 * - stallFairId vai na URL
 * - body NÃO leva stallFairId (evita 400 "should not exist")
 */
export function usePatchStallFairTaxMutation(ownerId: string, fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stallFairId,
      taxId,
    }: usePatchStallFairTaxMutation.Input) =>
      patchStallFairTax(ownerId, fairId, stallFairId, { taxId }),

    onSuccess: async () => {
      // ✅ modal do interessado
      await qc.invalidateQueries({ queryKey: interestFairsKey(ownerId) });

      // ✅ tabela/modal de expositores da feira
      await qc.invalidateQueries({
        queryKey: fairExhibitorsQueryKeys.list(fairId),
      });
    },
  });
}

export namespace usePatchStallFairTaxMutation {
  export type Input = {
    stallFairId: string;
    taxId: string;
  };
}
