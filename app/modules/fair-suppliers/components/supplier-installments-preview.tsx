"use client";

import { CalendarDays } from "lucide-react";

import type { FairSupplierInstallment } from "../fair-suppliers.schema";
import { formatMoneyBRLFromCents } from "../fair-suppliers.schema";
import { SupplierInstallmentStatusBadge } from "./supplier-installment-status-badge";

function formatDate(date?: string | null) {
  if (!date) return "Sem vencimento";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function SupplierInstallmentsPreview({
  installments,
  compact = false,
}: {
  installments: FairSupplierInstallment[];
  compact?: boolean;
}) {
  if (!installments.length) {
    return <span className="text-xs text-primary/50">Sem parcelas</span>;
  }

  return (
    <div className={compact ? "space-y-1" : "grid gap-2"}>
      {installments
        .slice()
        .sort((a, b) => a.number - b.number)
        .map((installment) => (
          <div
            key={installment.id ?? installment.number}
            className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-primary/68"
          >
            <span className="font-medium text-primary">Parcela {installment.number}:</span>
            <span>{formatMoneyBRLFromCents(installment.amountCents)}</span>
            <SupplierInstallmentStatusBadge status={installment.status} />
            {!compact ? (
              <span className="inline-flex items-center gap-1 text-primary/48">
                <CalendarDays className="h-3 w-3" />
                {formatDate(installment.dueDate)}
              </span>
            ) : null}
          </div>
        ))}
    </div>
  );
}
