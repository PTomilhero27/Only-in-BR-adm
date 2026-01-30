"use client";

/**
 * Tile de Feiras no Dashboard.
 *
 * Regras:
 * - Mostra apenas feiras ATIVAS (contagem).
 * - Clique:
 *   - 0 ativas -> modal "Cadastrar nova feira"
 *   - 1 ativa -> entra direto na feira
 *   - 2+ ativas -> modal com filtro/lista (apenas ativas)
 *
 * Decisão:
 * - Buscamos ATIVAS direto no backend para reduzir carga no dashboard
 * - Mantemos fallback de UX (loading, erro)
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Store } from "lucide-react";

import { NoActiveFairsDialog } from "./no-active-fairs-dialog";
import { FairSwitcherDialog } from "./fair-switcher-dialog";
import { DashboardTile } from "../dashboard-tile";

import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";

export function FairsDashboardTile() {
  const router = useRouter();

  // ✅ Dashboard precisa somente das ATIVAS
  const {
    data: activeFairs = [],
    isLoading,
    isError,
    error,
  } = useFairsQuery({ status: "ATIVA" });

  

  const [openPicker, setOpenPicker] = useState(false);
  const [openNoActive, setOpenNoActive] = useState(false);

  const { activeCount, pendingCount } = useMemo(() => {
    // TODO: pendências reais virão do backend (financeiro/contratos etc.)
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

  const showPending = pendingCount > 0;

  return (
    <>
      <DashboardTile
        title="Feiras"
        description="Gestão e acesso rápido"
        onClick={handleClick}
        icon={<Store className="h-5 w-5" />}
        accentClassName="bg-blue-500"
        rightSlot={
          showPending ? (
            <div className="relative">
              <Bell className="h-5 w-5 text-red-600" />
              <span className="sr-only">Há pendências</span>
            </div>
          ) : null
        }
      >
        <div>
          <div className="text-xs text-muted-foreground">Ativas</div>
          <div className="text-2xl font-semibold">
            {isLoading ? "…" : activeCount}
          </div>
        </div>
      </DashboardTile>

      {/* Modal quando há 2+ feiras ativas */}
      <FairSwitcherDialog
        open={openPicker}
        onOpenChange={setOpenPicker}
        fairs={activeFairs}
        title="Selecionar feira ativa"
        description="Digite para filtrar e clique para abrir."
      />

      {/* Modal quando não há feira ativa */}
      <NoActiveFairsDialog
        open={openNoActive}
        onOpenChange={setOpenNoActive}
      />
    </>
  );
}
