"use client";

/**
 * Empty state reutilizável do módulo.
 *
 * Responsabilidade:
 * - Evitar mensagens vazias diferentes em cada tabela.
 * - Manter a experiência administrativa objetiva quando filtros não retornam dados.
 */

import { Boxes } from "lucide-react";

export function InventoryEmptyState({
  title = "Nenhum registro encontrado",
  description = "Ajuste os filtros ou cadastre um novo item para começar.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border bg-muted text-primary/60">
        <Boxes className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-medium text-primary">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
