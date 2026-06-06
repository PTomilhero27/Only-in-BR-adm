/**
 * Service do módulo de Estoque / Armazenagem.
 *
 * Responsabilidade:
 * - Centralizar todos os endpoints do backend NestJS.
 * - Aplicar validação Zod nos payloads principais.
 * - Compor o resumo do dashboard quando não houver endpoint dedicado.
 */

import { api } from "@/app/shared/http/api";
import { z } from "zod";


import {
  approveInventoryReservationSchema,
  cancelInventoryReservationSchema,
  checkInventoryAvailabilitySchema,
  createInventoryItemSchema,
  createInventoryMovementSchema,
  createInventoryReservationSchema,
  inventoryAvailabilityResponseSchema,
  inventoryItemSchema,
  inventoryItemsResponseSchema,
  inventoryMovementSchema,
  inventoryMovementsResponseSchema,
  inventoryReservationSchema,
  inventoryReservationsResponseSchema,
  pickupInventoryReservationSchema,
  returnInventoryReservationSchema,
  updateInventoryItemSchema,
  inventoryImportParamsSchema,
  inventoryImportPreviewResponseSchema,
  inventoryImportConfirmResponseSchema,
  inventoryCategorySchema,
} from "./inventory.schemas";
import type {
  ApproveInventoryReservationInput,
  CancelInventoryReservationInput,
  CheckInventoryAvailabilityInput,
  CreateInventoryItemInput,
  CreateInventoryMovementInput,
  CreateInventoryReservationInput,
  InventoryDashboardSummary,
  InventoryItem,
  InventoryListResponse,
  InventoryMovement,
  InventoryReservation,
  ListInventoryItemsParams,
  ListInventoryMovementsParams,
  ListInventoryReservationsParams,
  PickupInventoryReservationInput,
  ReturnInventoryReservationInput,
  UpdateInventoryItemInput,
  InventoryImportParams,
  InventoryImportPreviewResponse,
  InventoryImportConfirmResponse,
  InventoryCategory,
} from "./types";

function toQuery(params?: Record<string, unknown>) {
  const qs = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "ALL") {
      return;
    }
    qs.set(key, String(value));
  });

  const query = qs.toString();
  return query ? `?${query}` : "";
}

export async function listInventoryItems(
  params?: ListInventoryItemsParams,
): Promise<InventoryListResponse<InventoryItem>> {
  const data = await api.get(`inventory/items${toQuery(params)}`);
  try {
    return inventoryItemsResponseSchema.parse(data);
  } catch (error) {
    console.error("Zod validation error in listInventoryItems:", error);
    throw error;
  }
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const data = await api.get(`inventory/items/${id}`);
  return inventoryItemSchema.parse(data);
}

export async function createInventoryItem(
  payload: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const body = createInventoryItemSchema.parse(payload);
  const data = await api.post("inventory/items", body);
  return inventoryItemSchema.parse(data);
}

export async function updateInventoryItem(
  id: string,
  payload: UpdateInventoryItemInput,
): Promise<InventoryItem> {
  const body = updateInventoryItemSchema.parse(payload);
  const data = await api.patch(`inventory/items/${id}`, body);
  return inventoryItemSchema.parse(data);
}

export async function inactiveInventoryItem(id: string): Promise<InventoryItem> {
  const data = await api.patch(`inventory/items/${id}/inactive`);
  return inventoryItemSchema.parse(data);
}

export async function createInventoryItemMovement(
  itemId: string,
  payload: CreateInventoryMovementInput,
): Promise<InventoryMovement> {
  const body = createInventoryMovementSchema.parse(payload);
  const data = await api.post(`inventory/items/${itemId}/movements`, body);
  return inventoryMovementSchema.parse(data);
}

export async function checkInventoryAvailability(
  payload: CheckInventoryAvailabilityInput,
) {
  const body = checkInventoryAvailabilitySchema.parse(payload);
  const data = await api.post("inventory/availability", body);
  return inventoryAvailabilityResponseSchema.parse(data);
}

export async function listInventoryReservations(
  params?: ListInventoryReservationsParams,
): Promise<InventoryListResponse<InventoryReservation>> {
  const data = await api.get(`inventory/reservations${toQuery(params)}`);
  return inventoryReservationsResponseSchema.parse(data);
}

export async function getInventoryReservation(
  id: string,
): Promise<InventoryReservation> {
  const data = await api.get(`inventory/reservations/${id}`);
  return inventoryReservationSchema.parse(data);
}

export async function createInventoryReservation(
  payload: CreateInventoryReservationInput,
): Promise<InventoryReservation> {
  const body = createInventoryReservationSchema.parse(payload);
  const data = await api.post("inventory/reservations", body);
  return inventoryReservationSchema.parse(data);
}

export async function approveInventoryReservation(
  id: string,
  payload: ApproveInventoryReservationInput,
): Promise<InventoryReservation> {
  const body = approveInventoryReservationSchema.parse(payload);
  const data = await api.patch(`inventory/reservations/${id}/approve`, body);
  return inventoryReservationSchema.parse(data);
}

export async function markInventoryReservationSeparating(
  id: string,
): Promise<InventoryReservation> {
  const data = await api.patch(`inventory/reservations/${id}/separating`);
  return inventoryReservationSchema.parse(data);
}

export async function markInventoryReservationReady(
  id: string,
): Promise<InventoryReservation> {
  const data = await api.patch(`inventory/reservations/${id}/ready`);
  return inventoryReservationSchema.parse(data);
}

export async function pickupInventoryReservation(
  id: string,
  payload: PickupInventoryReservationInput,
): Promise<InventoryReservation> {
  const body = pickupInventoryReservationSchema.parse(payload);
  const data = await api.patch(`inventory/reservations/${id}/pickup`, body);
  return inventoryReservationSchema.parse(data);
}

export async function returnInventoryReservation(
  id: string,
  payload: ReturnInventoryReservationInput,
): Promise<InventoryReservation> {
  const body = returnInventoryReservationSchema.parse(payload);
  const data = await api.patch(`inventory/reservations/${id}/return`, body);
  return inventoryReservationSchema.parse(data);
}

export async function cancelInventoryReservation(
  id: string,
  payload: CancelInventoryReservationInput,
): Promise<InventoryReservation> {
  const body = cancelInventoryReservationSchema.parse(payload);
  const data = await api.patch(`inventory/reservations/${id}/cancel`, body);
  return inventoryReservationSchema.parse(data);
}

export async function listInventoryMovements(
  params?: ListInventoryMovementsParams,
): Promise<InventoryListResponse<InventoryMovement>> {
  const data = await api.get(`inventory/movements${toQuery(params)}`);
  return inventoryMovementsResponseSchema.parse(data);
}

export async function getInventoryDashboardSummary(): Promise<InventoryDashboardSummary> {
  const [items, reservations] = await Promise.all([
    listInventoryItems(),
    listInventoryReservations(),
  ]);

  return {
    totalItems: items.data.length,
    lowStockItems: items.data.filter((item) => item.status === "LOW_STOCK").length,
    outOfStockItems: items.data.filter((item) => item.status === "OUT_OF_STOCK")
      .length,
    pendingReservations: reservations.data.filter(
      (reservation) => reservation.status === "PENDING",
    ).length,
    readyForPickupReservations: reservations.data.filter(
      (reservation) => reservation.status === "READY_FOR_PICKUP",
    ).length,
    pickedUpReservations: reservations.data.filter(
      (reservation) => reservation.status === "PICKED_UP",
    ).length,
  };
}

export async function getInventoryImportPreview(
  payload?: InventoryImportParams,
): Promise<InventoryImportPreviewResponse> {
  const body = inventoryImportParamsSchema.parse(payload ?? {});
  const data = await api.post("inventory/import/preview", body);
  return inventoryImportPreviewResponseSchema.parse(data);
}

export async function confirmInventoryImport(
  payload?: InventoryImportParams,
): Promise<InventoryImportConfirmResponse> {
  const body = inventoryImportParamsSchema.parse(payload ?? {});
  const data = await api.post("inventory/import/confirm", body);
  return inventoryImportConfirmResponseSchema.parse(data);
}

export async function listInventoryCategories(): Promise<InventoryCategory[]> {
  const data = await api.get("inventory/categories");
  return z.array(inventoryCategorySchema).parse(data);
}

export async function createInventoryCategory(name: string): Promise<InventoryCategory> {
  const data = await api.post("inventory/categories", { name });
  return inventoryCategorySchema.parse(data);
}

export async function deleteInventoryCategory(id: string): Promise<void> {
  await api.delete(`inventory/categories/${id}`);
}

export async function returnManualMovement(
  movementId: string,
  quantity: number,
  finalize?: boolean,
): Promise<InventoryMovement> {
  const data = await api.post(`inventory/movements/${movementId}/return`, {
    quantity,
    finalize,
  });
  return inventoryMovementSchema.parse(data);
}
