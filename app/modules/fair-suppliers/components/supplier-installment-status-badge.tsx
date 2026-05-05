"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SupplierInstallmentStatus } from "../fair-suppliers.schema";

const labels: Record<SupplierInstallmentStatus, string> = {
  PENDING: "Pendente",
  IN_REMITTANCE: "Em remessa",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

const tones: Record<SupplierInstallmentStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  IN_REMITTANCE: "border-indigo-200 bg-indigo-50 text-indigo-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

export function supplierInstallmentStatusLabel(status?: SupplierInstallmentStatus | null) {
  return status ? labels[status] : "Pendente";
}

export function SupplierInstallmentStatusBadge({
  status,
}: {
  status?: SupplierInstallmentStatus | null;
}) {
  const safeStatus = status ?? "PENDING";

  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", tones[safeStatus])}
    >
      {labels[safeStatus]}
    </Badge>
  );
}
