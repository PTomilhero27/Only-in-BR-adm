"use client";

import { useMemo } from "react";
import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { useGlobalFair } from "../../../components/global-fair-provider";

type ContractTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type FairContractSettingsViewModel =
  | null
  | {
      id: string;
      templateId: string;
      updatedAt: string;
      template: {
        id: string;
        title: string;
        status: ContractTemplateStatus;
        isAddendum: boolean;
        updatedAt: string;
      };
    };

export function FairContractSettingsCard(props: {
  fairName: string;
  contractSettings: FairContractSettingsViewModel;
  isLoading?: boolean;
  onOpenDialog: () => void;
}) {
  const { contractSettings, isLoading, onOpenDialog } = props;
  const { isFinalizada } = useGlobalFair();

  const statusLabel = useMemo(() => {
    const status = contractSettings?.template?.status;
    if (!status) return null;
    const map: Record<ContractTemplateStatus, string> = {
      DRAFT: "Rascunho",
      PUBLISHED: "Publicado",
      ARCHIVED: "Arquivado",
    };
    return map[status];
  }, [contractSettings]);

  const contractTitle = contractSettings?.template.title ?? null;

  return (
    <button
      type="button"
      onClick={onOpenDialog}
      disabled={Boolean(isLoading) || isFinalizada}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] text-primary/70 shadow-[0_1px_3px_0_rgba(1,0,119,0.06)] transition-colors",
        "hover:border-[color:var(--brand-pink)]/30 hover:bg-[color:var(--brand-pink)]/[0.03] hover:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-white",
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-[color:var(--brand-pink)]/60" />
      <span className="uppercase tracking-wide">Contrato</span>
      {contractTitle ? (
        <span className="max-w-[120px] truncate font-medium text-primary">{contractTitle}</span>
      ) : (
        <span className="text-primary/50">Nenhum</span>
      )}
      {statusLabel ? (
        <span className="text-primary/40">&middot; {statusLabel}</span>
      ) : null}
    </button>
  );
}
