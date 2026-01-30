"use client";

import { useParams } from "next/navigation";

/**
 * Página de Fornecedores da feira.
 * Por enquanto é placeholder para evitar 404 e permitir navegação.
 */
export default function FairSuppliersPage() {
  const { fairId } = useParams<{ fairId: string }>();

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-semibold">Fornecedores</h1>
      <p className="text-sm text-muted-foreground">
        Feira: <code>{fairId}</code> — em construção.
      </p>
    </div>
  );
}
