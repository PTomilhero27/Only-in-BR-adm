"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SupplierStatus } from "../fair-suppliers.schema";

const labels: Record<SupplierStatus, string> = {
  PENDING: "Pendente",
  PARTIALLY_PAID: "Parcialmente pago",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

const tones: Record<SupplierStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  PARTIALLY_PAID: "border-blue-200 bg-blue-50 text-blue-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

export function supplierStatusLabel(status?: SupplierStatus | null) {
  return status ? labels[status] : "Pendente";
}

export function SupplierStatusBadge({ status }: { status?: SupplierStatus | null }) {
  const safeStatus = status ?? "PENDING";

  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-3 py-1 text-xs font-medium", tones[safeStatus])}
    >
      {labels[safeStatus]}
    </Badge>
  );
}
