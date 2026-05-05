import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ImportedSpreadsheetStatus } from "../types";

type Props = {
  status?: ImportedSpreadsheetStatus | string | null;
  className?: string;
};

export function ImportedSpreadsheetStatusBadge({ status, className }: Props) {
  if (!status) return null;

  const isPago = status === "PAGO";
  const label = isPago ? "Pago na planilha" : "Não pago na planilha";
  const badgeClasses = isPago
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Badge variant="outline" className={cn("rounded-full whitespace-nowrap", badgeClasses, className)}>
      {label}
    </Badge>
  );
}
