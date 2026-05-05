"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SupplierPaymentSummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "success" | "warn" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
      : tone === "warn"
        ? "text-amber-700 bg-amber-50 border-amber-100"
        : tone === "danger"
          ? "text-rose-700 bg-rose-50 border-rose-100"
          : "text-primary bg-white border-border";

  return (
    <Card className={cn("py-0 shadow-[0_20px_48px_-42px_rgba(1,0,119,0.16)]", toneClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs uppercase text-primary/50">{label}</div>
            <div className="font-display text-xl text-primary">{value}</div>
            {helper ? <div className="text-xs text-primary/55">{helper}</div> : null}
          </div>
          <div className="rounded-md border border-current/10 bg-white/70 p-2 text-current">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
