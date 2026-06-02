/**
 * Tipos compartilhados do módulo de Estoque / Armazenagem.
 *
 * Responsabilidade:
 * - Espelhar os enums principais do backend NestJS.
 * - Definir contratos usados por services, queries e componentes.
 * - Manter labels em português centralizados para evitar divergência visual.
 */

export type InventoryItemStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "INACTIVE"
  | "DAMAGED";

export type InventoryReservationStatus =
  | "PENDING"
  | "APPROVED"
  | "SEPARATING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "PARTIALLY_RETURNED"
  | "RETURNED"
  | "CANCELLED";

export type InventoryMovementType =
  | "IN"
  | "OUT"
  | "RETURN"
  | "LOSS"
  | "ADJUSTMENT"
  | "DAMAGE";

export const inventoryItemStatusLabels: Record<InventoryItemStatus, string> = {
  IN_STOCK: "Em estoque",
  LOW_STOCK: "Estoque baixo",
  OUT_OF_STOCK: "Sem estoque",
  INACTIVE: "Inativo",
  DAMAGED: "Danificado",
};

export const inventoryReservationStatusLabels: Record<
  InventoryReservationStatus,
  string
> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  SEPARATING: "Em separação",
  READY_FOR_PICKUP: "Pronta para retirada",
  PICKED_UP: "Retirada",
  PARTIALLY_RETURNED: "Parcialmente devolvida",
  RETURNED: "Devolvida",
  CANCELLED: "Cancelada",
};

export const inventoryMovementTypeLabels: Record<InventoryMovementType, string> =
  {
    IN: "Entrada",
    OUT: "Saída",
    RETURN: "Devolução",
    LOSS: "Perda/consumo",
    ADJUSTMENT: "Ajuste",
    DAMAGE: "Dano",
  };

export type InventoryItem = {
  id: string;
  name: string;
  category?: string | null;
  unit: string;
  imageUrl?: string | null;
  location?: string | null;
  currentQty: number;
  minQty: number;
  status: InventoryItemStatus;
  notes?: string | null;
  reservedQty?: number;
  availableQty?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type InventoryReservationItem = {
  id?: string;
  itemId: string;
  item?: InventoryItem | null;
  itemName?: string | null;
  requestedQty: number;
  approvedQty?: number;
  pickedQty?: number;
  returnedQty?: number;
  lostQty?: number;
  consumedQty?: number;
  damagedQty?: number;
  notes?: string | null;
};

export type InventoryReservation = {
  id: string;
  code?: string | null;
  fairId?: string | null;
  fairName?: string | null;
  purpose?: string | null;
  requesterName?: string | null;
  responsibleName?: string | null;
  expectedPickupAt?: string | null;
  pickedUpAt?: string | null;
  returnedAt?: string | null;
  notes?: string | null;
  status: InventoryReservationStatus;
  items: InventoryReservationItem[];
  movements?: InventoryMovement[];
  createdAt?: string;
  updatedAt?: string;
};

export type InventoryMovement = {
  id: string;
  itemId?: string | null;
  item?: InventoryItem | null;
  itemName?: string | null;
  reservationId?: string | null;
  fairId?: string | null;
  fairName?: string | null;
  purpose?: string | null;
  type: InventoryMovementType;
  quantity: number;
  previousQty?: number | null;
  nextQty?: number | null;
  responsibleName?: string | null;
  createdByName?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export type InventoryDashboardSummary = {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingReservations: number;
  readyForPickupReservations: number;
  pickedUpReservations: number;
};

export type InventoryListResponse<T> = {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
};

export type ListInventoryItemsParams = {
  search?: string;
  category?: string;
  status?: InventoryItemStatus | "ALL";
  lowStock?: boolean;
  page?: number;
  perPage?: number;
};

export type ListInventoryReservationsParams = {
  search?: string;
  status?: InventoryReservationStatus | "ALL";
  fairId?: string;
  pickupFrom?: string;
  pickupTo?: string;
};

export type ListInventoryMovementsParams = {
  itemId?: string;
  type?: InventoryMovementType | "ALL";
  fairId?: string;
  from?: string;
  to?: string;
};

export type CreateInventoryItemInput = {
  name: string;
  category?: string | null;
  unit: string;
  imageUrl?: string | null;
  location?: string | null;
  initialQty?: number;
  minQty: number;
  status?: InventoryItemStatus;
  notes?: string | null;
};

export type UpdateInventoryItemInput = Partial<CreateInventoryItemInput>;

export type CreateInventoryMovementInput = {
  type: Extract<InventoryMovementType, "IN" | "ADJUSTMENT" | "DAMAGE">;
  quantity: number;
  notes?: string;
  purpose?: string;
};

export type CheckInventoryAvailabilityInput = {
  items: Array<{ itemId: string; quantity: number }>;
};

export type InventoryAvailabilityResult = {
  itemId: string;
  itemName?: string;
  requestedQty: number;
  availableQty: number;
  isAvailable: boolean;
};

export type CreateInventoryReservationInput = {
  fairId?: string | null;
  purpose?: string | null;
  requesterName?: string | null;
  responsibleName?: string | null;
  expectedPickupAt?: string | null;
  notes?: string | null;
  items: Array<{ itemId: string; requestedQty: number; notes?: string | null }>;
};

export type ApproveInventoryReservationInput = {
  notes?: string | null;
  items: Array<{ itemId: string; approvedQty: number; notes?: string | null }>;
};

export type PickupInventoryReservationInput = {
  notes?: string | null;
  items: Array<{ itemId: string; pickedQty: number; notes?: string | null }>;
};

export type ReturnInventoryReservationInput = {
  notes?: string | null;
  items: Array<{
    itemId: string;
    returnedQty: number;
    consumedQty?: number;
    lostQty?: number;
    damagedQty?: number;
    notes?: string | null;
  }>;
};

export type CancelInventoryReservationInput = {
  notes: string;
};

export type InventoryImportParams = {
  sheetName?: string;
  headerRow?: number;
  dataStartRow?: number;
};

export type InventoryImportRowItem = {
  id?: string | null;
  name: string;
  quantity: number;
  notes?: string | null;
  imageUrl?: string | null;
  existingItem?: InventoryItem | null;
};

export type InventoryImportRow = {
  rowNumber: number;
  action: "CREATE" | "UPDATE";
  status: "VALID" | "INVALID";
  item: InventoryImportRowItem;
  errors: string[];
  warnings: string[];
};

export type InventoryImportSummary = {
  totalRows: number;
  validCount: number;
  newCount: number;
  updateCount: number;
  errorCount: number;
};

export type InventoryImportPreviewResponse = {
  summary: InventoryImportSummary;
  rows: InventoryImportRow[];
};

export type InventoryImportConfirmResponse = {
  message: string;
  createdCount: number;
  updatedCount: number;
};

