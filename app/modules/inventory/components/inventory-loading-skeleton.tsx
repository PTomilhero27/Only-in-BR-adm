"use client";

/**
 * Skeleton padrão do módulo.
 *
 * Responsabilidade:
 * - Padronizar carregamentos de tabelas e cards sem duplicar marcação visual.
 */

import { Skeleton } from "@/components/ui/skeleton";

export function InventoryLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}
