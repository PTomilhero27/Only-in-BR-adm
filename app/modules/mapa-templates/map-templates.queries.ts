import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapTemplatesService } from "./map-templates.service";
import type { UpsertMapTemplateInput } from "./map-templates.schema";

/**
 * Query keys centralizados para evitar inconsistência e facilitar invalidations.
 */
export const mapTemplatesKeys = {
  all: ["map-templates"] as const,
  list: () => [...mapTemplatesKeys.all, "list"] as const,
  byId: (id: string) => [...mapTemplatesKeys.all, "byId", id] as const,
};

export function useMapTemplatesQuery() {
  return useQuery({
    queryKey: mapTemplatesKeys.list(),
    queryFn: () => mapTemplatesService.list(),
  });
}

export function useMapTemplateQuery(templateId: string, enabled = true) {
  return useQuery({
    queryKey: mapTemplatesKeys.byId(templateId),
    queryFn: () => mapTemplatesService.getById(templateId),
    enabled,
  });
}

export function useCreateMapTemplateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertMapTemplateInput) => mapTemplatesService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mapTemplatesKeys.all });
    },
  });
}

export function useUpdateMapTemplateMutation(templateId: string) {
  console.log("Initializing update mutation for templateId:", templateId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertMapTemplateInput) => mapTemplatesService.update(templateId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mapTemplatesKeys.all });
      qc.invalidateQueries({ queryKey: mapTemplatesKeys.byId(templateId) });
    },
  });
}

export function useDeleteMapTemplateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => mapTemplatesService.remove(templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mapTemplatesKeys.all });
    },
  });
}
