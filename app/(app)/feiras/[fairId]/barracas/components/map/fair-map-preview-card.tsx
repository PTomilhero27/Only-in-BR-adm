"use client";

import { MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

type FairMapTemplatePreview = {
  id: string;
  title?: string | null;
  elements?: Array<{ id: string; type: string }>;
};

type FairMapLinkPreview = {
  stallFairId: string;
  slotClientKey: string;
  slotNumber?: number | null;
};

type FairMapPreview = {
  id: string;
  templateId: string;
  templateVersionAtLink?: number | null;
  template?: FairMapTemplatePreview | null;
  links?: FairMapLinkPreview[] | null;
};

type Props = {
  fairId: string;
  fairName: string;
  isLoading: boolean;
  fairMap: FairMapPreview | null;
  onOpenMap: () => void;
  defaultOpen?: boolean;
};

export function FairMapPreviewCard({
  isLoading,
  fairMap,
  onOpenMap,
}: Props) {
  const hasMap = Boolean(fairMap?.id && fairMap?.templateId);
  const elements = fairMap?.template?.elements ?? [];
  const totalSlots = elements.filter((e) => e.type === "BOOTH_SLOT").length;
  const linkedSlots = fairMap?.links?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpenMap}
      disabled={isLoading || !hasMap}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] text-primary/70 shadow-[0_1px_3px_0_rgba(1,0,119,0.06)] transition-colors",
        "hover:border-[color:var(--brand-blue)]/30 hover:bg-[color:var(--brand-blue)]/[0.03] hover:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-white",
      )}
    >
      <MapPinned className="h-3.5 w-3.5 shrink-0 text-[color:var(--brand-blue)]/60" />
      <span className="uppercase tracking-wide">Mapa da feira</span>
      <span className="font-medium text-primary">
        {isLoading ? "…" : `${linkedSlots}/${totalSlots || 0}`}
      </span>
    </button>
  );
}
