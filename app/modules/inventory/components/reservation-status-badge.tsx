"use client";

/**
 * Badge de status da reserva.
 *
 * Responsabilidade:
 * - Deixar visível a etapa atual do ciclo de reserva.
 * - Reutilizar as mesmas cores nas tabelas, detalhes e menus de ação.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  inventoryReservationStatusLabels,
  type InventoryReservationStatus,
} from "../types";

const statusClassName: Record<InventoryReservationStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-sky-200 bg-sky-50 text-sky-700",
  SEPARATING: "border-violet-200 bg-violet-50 text-violet-700",
  READY_FOR_PICKUP: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PICKED_UP: "border-orange-200 bg-orange-50 text-orange-700",
  PARTIALLY_RETURNED: "border-yellow-200 bg-yellow-50 text-yellow-800",
  RETURNED: "border-green-200 bg-green-50 text-green-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
};

export function ReservationStatusBadge({
  status,
}: {
  status: InventoryReservationStatus;
}) {
  return (
    <Badge variant="outline" className={cn("font-normal", statusClassName[status])}>
      {inventoryReservationStatusLabels[status]}
    </Badge>
  );
}
