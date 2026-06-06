/**
 * Hooks TanStack Query do módulo de Estoque / Armazenagem.
 *
 * Responsabilidade:
 * - Padronizar queryKeys e cache da feature.
 * - Centralizar invalidações após mutações importantes.
 * - Deixar páginas e componentes livres de detalhes de integração.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveInventoryReservation,
  cancelInventoryReservation,
  checkInventoryAvailability,
  createInventoryItem,
  createInventoryItemMovement,
  createInventoryReservation,
  getInventoryDashboardSummary,
  getInventoryItem,
  getInventoryReservation,
  inactiveInventoryItem,
  listInventoryItems,
  listInventoryMovements,
  listInventoryReservations,
  markInventoryReservationReady,
  markInventoryReservationSeparating,
  pickupInventoryReservation,
  returnInventoryReservation,
  updateInventoryItem,
  getInventoryImportPreview,
  confirmInventoryImport,
  listInventoryCategories,
  createInventoryCategory,
  deleteInventoryCategory,
  returnManualMovement,
} from "./inventory.service";
import type {
  ApproveInventoryReservationInput,
  CancelInventoryReservationInput,
  CheckInventoryAvailabilityInput,
  CreateInventoryItemInput,
  CreateInventoryMovementInput,
  CreateInventoryReservationInput,
  ListInventoryItemsParams,
  ListInventoryMovementsParams,
  ListInventoryReservationsParams,
  PickupInventoryReservationInput,
  ReturnInventoryReservationInput,
  UpdateInventoryItemInput,
  InventoryImportParams,
} from "./types";

export const inventoryKeys = {
  all: ["inventory"] as const,
  dashboard: () => [...inventoryKeys.all, "dashboard"] as const,
  items: (params?: ListInventoryItemsParams) =>
    [...inventoryKeys.all, "items", params ?? {}] as const,
  item: (id: string) => [...inventoryKeys.all, "items", id] as const,
  reservations: (params?: ListInventoryReservationsParams) =>
    [...inventoryKeys.all, "reservations", params ?? {}] as const,
  reservation: (id: string) =>
    [...inventoryKeys.all, "reservations", id] as const,
  movements: (params?: ListInventoryMovementsParams) =>
    [...inventoryKeys.all, "movements", params ?? {}] as const,
  availability: (payload?: CheckInventoryAvailabilityInput) =>
    [...inventoryKeys.all, "availability", payload ?? {}] as const,
  categories: () => [...inventoryKeys.all, "categories"] as const,
};

function invalidateInventoryLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard() });
  queryClient.invalidateQueries({ queryKey: [...inventoryKeys.all, "items"] });
}

function invalidateReservations(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard() });
  queryClient.invalidateQueries({
    queryKey: [...inventoryKeys.all, "reservations"],
  });
  queryClient.invalidateQueries({ queryKey: [...inventoryKeys.all, "items"] });
}

export function useInventoryDashboardSummaryQuery() {
  return useQuery({
    queryKey: inventoryKeys.dashboard(),
    queryFn: getInventoryDashboardSummary,
    staleTime: 20_000,
  });
}

export function useInventoryItemsQuery(params?: ListInventoryItemsParams) {
  return useQuery({
    queryKey: inventoryKeys.items(params),
    queryFn: () => listInventoryItems(params),
  });
}

export function useInventoryItemQuery(id?: string) {
  return useQuery({
    queryKey: inventoryKeys.item(id ?? ""),
    queryFn: () => getInventoryItem(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryItemInput) => createInventoryItem(payload),
    onSuccess: () => invalidateInventoryLists(queryClient),
  });
}

export function useUpdateInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: UpdateInventoryItemInput }) =>
      updateInventoryItem(args.id, args.payload),
    onSuccess: (_data, args) => {
      invalidateInventoryLists(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(args.id) });
    },
  });
}

export function useInactiveInventoryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inactiveInventoryItem(id),
    onSuccess: (_data, id) => {
      invalidateInventoryLists(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(id) });
    },
  });
}

export function useCreateInventoryMovementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { itemId: string; payload: CreateInventoryMovementInput }) =>
      createInventoryItemMovement(args.itemId, args.payload),
    onSuccess: (_data, args) => {
      invalidateInventoryLists(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(args.itemId) });
      queryClient.invalidateQueries({
        queryKey: [...inventoryKeys.all, "movements"],
      });
    },
  });
}

export function useCheckInventoryAvailabilityMutation() {
  return useMutation({
    mutationFn: (payload: CheckInventoryAvailabilityInput) =>
      checkInventoryAvailability(payload),
  });
}

export function useInventoryReservationsQuery(
  params?: ListInventoryReservationsParams,
) {
  return useQuery({
    queryKey: inventoryKeys.reservations(params),
    queryFn: () => listInventoryReservations(params),
  });
}

export function useInventoryReservationQuery(id?: string) {
  return useQuery({
    queryKey: inventoryKeys.reservation(id ?? ""),
    queryFn: () => getInventoryReservation(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateInventoryReservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryReservationInput) =>
      createInventoryReservation(payload),
    onSuccess: () => invalidateReservations(queryClient),
  });
}

export function useApproveInventoryReservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: ApproveInventoryReservationInput }) =>
      approveInventoryReservation(args.id, args.payload),
    onSuccess: (_data, args) => {
      invalidateReservations(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.reservation(args.id) });
    },
  });
}

export function useMarkInventoryReservationSeparatingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markInventoryReservationSeparating(id),
    onSuccess: (_data, id) => {
      invalidateReservations(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.reservation(id) });
    },
  });
}

export function useMarkInventoryReservationReadyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markInventoryReservationReady(id),
    onSuccess: (_data, id) => {
      invalidateReservations(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.reservation(id) });
    },
  });
}

export function usePickupInventoryReservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: PickupInventoryReservationInput }) =>
      pickupInventoryReservation(args.id, args.payload),
    onSuccess: (_data, args) => {
      invalidateReservations(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.reservation(args.id) });
      queryClient.invalidateQueries({
        queryKey: [...inventoryKeys.all, "movements"],
      });
    },
  });
}

export function useReturnInventoryReservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: ReturnInventoryReservationInput }) =>
      returnInventoryReservation(args.id, args.payload),
    onSuccess: (_data, args) => {
      invalidateReservations(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.reservation(args.id) });
      queryClient.invalidateQueries({
        queryKey: [...inventoryKeys.all, "movements"],
      });
    },
  });
}

export function useCancelInventoryReservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: CancelInventoryReservationInput }) =>
      cancelInventoryReservation(args.id, args.payload),
    onSuccess: (_data, args) => {
      invalidateReservations(queryClient);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.reservation(args.id) });
    },
  });
}

export function useInventoryMovementsQuery(params?: ListInventoryMovementsParams) {
  return useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: () => listInventoryMovements(params),
  });
}

export function useInventoryImportPreviewMutation() {
  return useMutation({
    mutationFn: (payload?: InventoryImportParams) => getInventoryImportPreview(payload),
  });
}

export function useConfirmInventoryImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: InventoryImportParams) => confirmInventoryImport(payload),
    onSuccess: () => {
      invalidateInventoryLists(queryClient);
    },
  });
}

export function useInventoryCategoriesQuery() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: listInventoryCategories,
  });
}

export function useCreateInventoryCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createInventoryCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

export function useDeleteInventoryCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInventoryCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

export function useReturnManualMovementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; quantity: number; finalize?: boolean }) =>
      returnManualMovement(args.id, args.quantity, args.finalize),
    onSuccess: () => {
      invalidateInventoryLists(queryClient);
      queryClient.invalidateQueries({
        queryKey: [...inventoryKeys.all, "movements"],
      });
    },
  });
}
