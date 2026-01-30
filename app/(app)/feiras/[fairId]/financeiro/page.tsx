"use client";

import { useParams } from "next/navigation";

/**
 * Página de Financeiro da feira.
 * Placeholder inicial para evoluirmos com recebíveis, pendências e relatórios.
 */
export default function FairFinancePage() {
  const { fairId } = useParams<{ fairId: string }>();

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-semibold">Financeiro</h1>
      <p className="text-sm text-muted-foreground">
        Feira: <code>{fairId}</code> — em construção.
      </p>
    </div>
  );
}
