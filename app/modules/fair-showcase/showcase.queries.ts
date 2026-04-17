// app/modules/fair-showcase/showcase.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showcaseService } from "./showcase.service";
import type {
  CreateShowcaseRequest,
  UpdateShowcaseRequest,
} from "./showcase.schema";

/**
 * Query keys centralizadas do módulo FairShowcase.
 */
export const showcaseKeys = {
  all: ["fair-showcase"] as const,

  list: () => [...showcaseKeys.all, "list"] as const,

  byFairId: (fairId: string) =>
    [...showcaseKeys.all, "detail", fairId] as const,
};

// ───────────────────────── Queries ─────────────────────────

/**
 * Lista todas as vitrines (para cruzar com feiras ativas).
 */
export function useListShowcasesQuery(enabled = true) {
  return useQuery({
    queryKey: showcaseKeys.list(),
    queryFn: () => showcaseService.list(),
    enabled,
    staleTime: 15_000,
  });
}

/**
 * Busca a vitrine de uma feira específica.
 */
export function useShowcaseByFairIdQuery(fairId: string, enabled = true) {
  return useQuery({
    queryKey: showcaseKeys.byFairId(fairId),
    queryFn: () => showcaseService.getByFairId(fairId),
    enabled: Boolean(fairId) && enabled,
    staleTime: 10_000,
  });
}

// ───────────────────────── Mutations ─────────────────────────

export function useCreateShowcaseMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateShowcaseRequest) =>
      showcaseService.create(fairId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showcaseKeys.byFairId(fairId) });
      qc.invalidateQueries({ queryKey: showcaseKeys.list() });
    },
  });
}

export function useUpdateShowcaseMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateShowcaseRequest) =>
      showcaseService.update(fairId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showcaseKeys.byFairId(fairId) });
      qc.invalidateQueries({ queryKey: showcaseKeys.list() });
    },
  });
}

export function useRemoveShowcaseMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => showcaseService.remove(fairId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showcaseKeys.byFairId(fairId) });
      qc.invalidateQueries({ queryKey: showcaseKeys.list() });
    },
  });
}

export function usePublishShowcaseMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => showcaseService.publish(fairId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showcaseKeys.byFairId(fairId) });
      qc.invalidateQueries({ queryKey: showcaseKeys.list() });
    },
  });
}

export function useUnpublishShowcaseMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => showcaseService.unpublish(fairId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showcaseKeys.byFairId(fairId) });
      qc.invalidateQueries({ queryKey: showcaseKeys.list() });
    },
  });
}

export function useUploadShowcaseImageMutation(fairId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => showcaseService.uploadImage(fairId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showcaseKeys.byFairId(fairId) });
    },
  });
}
