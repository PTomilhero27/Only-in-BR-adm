"use client";

/**
 * Card de dashboard de Estoque / Armazenagem.
 *
 * Responsabilidade:
 * - Mostrar indicadores consolidados para a operação.
 * - Seguir o mesmo padrão visual (DashboardTile) dos outros cards do painel.
 * - Tratar loading, erro e ausência de dados de forma graciosa.
 */

import { AlertTriangle, Boxes, ClipboardList, Package, Warehouse } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardTile } from "@/app/(app)/dashboard/components/dashboard-tile";
import { useInventoryDashboardSummaryQuery } from "../inventory.queries";

export function InventoryDashboardCard() {
  const { data, isLoading, isError } = useInventoryDashboardSummaryQuery();

  const indicators = [
    { label: "Total de itens", value: data?.totalItems ?? 0, icon: Package },
    { label: "Estoque baixo", value: data?.lowStockItems ?? 0, icon: AlertTriangle },
    { label: "Sem estoque", value: data?.outOfStockItems ?? 0, icon: Warehouse },
    { label: "Pendentes", value: data?.pendingReservations ?? 0, icon: ClipboardList },
    { label: "Prontas", value: data?.readyForPickupReservations ?? 0, icon: Boxes },
  ];

  return (
    <DashboardTile
      title="Estoque / Armazenagem"
      description="Controle itens, reservas, retiradas e devoluções."
      eyebrow="Operação"
      icon={<Boxes className="h-5 w-5" />}
      accentClassName="bg-accent"
      href="/estoque"
      footer="Ver estoque"
    >
      <div className="space-y-3">
        {isError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Não foi possível carregar o resumo agora.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {indicators.map((indicator) => {
            const Icon = indicator.icon;
            return (
              <div key={indicator.label} className="rounded-lg border border-border bg-muted/30 p-3 transition duration-200 hover:border-primary/10 hover:bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {indicator.label}
                </div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-7 w-12" />
                ) : (
                  <p className="mt-2 text-2xl font-semibold text-primary">{indicator.value}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardTile>
  );
}
