"use client";

/**
 * Badge de disponibilidade.
 *
 * Responsabilidade:
 * - Resumir se um item pode ser usado em reservas ou movimentações.
 * - Considerar disponibilidade explícita do backend quando ela vier no payload.
 */

import { Badge } from "@/components/ui/badge";

type InventoryAvailabilityBadgeProps = {
  currentQty: number;
  minQty?: number;
  availableQty?: number;
  reservedQty?: number;
};

export function InventoryAvailabilityBadge({
  currentQty,
  minQty = 0,
  availableQty,
  reservedQty = 0,
}: InventoryAvailabilityBadgeProps) {
  const available = availableQty ?? Math.max(currentQty - reservedQty, 0);

  if (available <= 0) {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        Indisponível
      </Badge>
    );
  }

  if (reservedQty > 0 && available < currentQty) {
    return (
      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
        Parcialmente reservado
      </Badge>
    );
  }

  if (available <= minQty) {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
        Estoque baixo
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
      Disponível
    </Badge>
  );
}
