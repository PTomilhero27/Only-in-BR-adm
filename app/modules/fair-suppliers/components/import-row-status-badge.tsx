import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ImportRowStatus } from "../types";

type Props = {
  status: ImportRowStatus;
  className?: string;
};

export function ImportRowStatusBadge({ status, className }: Props) {
  const map: Record<ImportRowStatus, { label: string; className: string }> = {
    VALID: { label: "Válida", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    INVALID: { label: "Com erro", className: "border-rose-200 bg-rose-50 text-rose-700" },
    WARNING: { label: "Atenção", className: "border-amber-200 bg-amber-50 text-amber-700" },
  };

  const meta = map[status] || map.VALID;

  return (
    <Badge variant="outline" className={cn("rounded-full whitespace-nowrap", meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
