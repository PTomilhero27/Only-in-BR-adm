"use client";

/**
 * Badge de status do item de estoque.
 *
 * Responsabilidade:
 * - Traduzir o enum técnico do backend para uma leitura operacional em português.
 * - Aplicar cor consistente para a situação de estoque em todas as telas.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { inventoryItemStatusLabels, type InventoryItemStatus } from "../types";

const statusClassName: Record<InventoryItemStatus, string> = {
  IN_STOCK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LOW_STOCK: "border-amber-200 bg-amber-50 text-amber-700",
  OUT_OF_STOCK: "border-red-200 bg-red-50 text-red-700",
  INACTIVE: "border-slate-200 bg-slate-50 text-slate-600",
  DAMAGED: "border-orange-200 bg-orange-50 text-orange-700",
};

export function InventoryStatusBadge({ status }: { status: InventoryItemStatus }) {
  return (
    <Badge variant="outline" className={cn("font-normal", statusClassName[status])}>
      {inventoryItemStatusLabels[status]}
    </Badge>
  );
}
