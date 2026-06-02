"use client";

/**
 * Cards de resumo para a tela principal de estoque.
 *
 * Responsabilidade:
 * - Calcular KPIs locais a partir da listagem carregada.
 * - Evitar dependência de endpoint adicional para a tela de itens.
 */

import { AlertTriangle, Boxes, Package, Warehouse } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { InventoryItem } from "../types";

export function InventoryDashboardCards({ items }: { items: InventoryItem[] }) {
  const cards = [
    { label: "Total de itens", value: items.length, icon: Boxes },
    { label: "Em estoque", value: items.filter((item) => item.status === "IN_STOCK").length, icon: Package },
    { label: "Estoque baixo", value: items.filter((item) => item.status === "LOW_STOCK").length, icon: AlertTriangle },
    { label: "Sem estoque", value: items.filter((item) => item.status === "OUT_OF_STOCK").length, icon: Warehouse },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="rounded-lg bg-white">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{card.value}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted text-primary/70">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
