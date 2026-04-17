"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Store } from "lucide-react";

import { NoActiveFairsDialog } from "./no-active-fairs-dialog";
import { FairSwitcherDialog } from "./fair-switcher-dialog";
import { DashboardTile } from "../dashboard-tile";

import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { toast } from "@/components/ui/toast";

export function FairsDashboardTile() {
  const router = useRouter();
  const {
    data: activeFairs = [],
    isLoading,
    isError,
    error,
  } = useFairsQuery({ status: "ATIVA" });

  const [openPicker, setOpenPicker] = useState(false);
  const [openNoActive, setOpenNoActive] = useState(false);

  const { activeCount, pendingCount } = useMemo(() => {
    const pendingCount = 0;

    return {
      activeCount: activeFairs.length,
      pendingCount,
    };
  }, [activeFairs]);

  function handleClick() {
    if (isLoading) return;

    if (isError) {
      toast.error({
        title: "Erro",
        subtitle: getErrorMessage(error),
      });
      return;
    }

    if (activeFairs.length === 0) {
      setOpenNoActive(true);
      return;
    }

    if (activeFairs.length === 1) {
      router.push(`/feiras/${activeFairs[0].id}`);
      return;
    }

    setOpenPicker(true);
  }

  const footer = isLoading
    ? "Carregando feiras"
    : activeCount === 0
      ? "Cadastrar nova feira"
      : activeCount === 1
        ? "Abrir feira ativa"
        : "Escolher feira ativa";

  return (
    <>
      <DashboardTile
        title="Feiras"
        description="Acesse rapidamente o modulo principal da operacao."
        eyebrow="Modulo principal"
        onClick={handleClick}
        icon={<Store className="h-5 w-5" />}
        accentClassName="bg-brand-green"
        footer={footer}
        rightSlot={
          pendingCount > 0 ? (
            <div className="flex size-10 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Ha pendencias</span>
            </div>
          ) : (
            <div className="font-display rounded-md border border-border bg-muted px-3 py-1 text-[11px] text-primary/72">
              Prioridade
            </div>
          )
        }
      >
        <div className="flex items-center gap-2">
          <span className="font-display rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            {isLoading ? "Carregando" : `${activeCount} ativa${activeCount === 1 ? "" : "s"}`}
          </span>
        </div>
      </DashboardTile>

      <FairSwitcherDialog
        open={openPicker}
        onOpenChange={setOpenPicker}
        fairs={activeFairs}
        title="Selecionar feira ativa"
        description="Busque por nome, endereco ou data para abrir a feira certa."
      />

      <NoActiveFairsDialog
        open={openNoActive}
        onOpenChange={setOpenNoActive}
      />
    </>
  );
}
