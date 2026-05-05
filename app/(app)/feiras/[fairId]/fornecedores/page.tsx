"use client";

import { useParams } from "next/navigation";

import { FairSuppliersPage } from "@/app/modules/fair-suppliers/components/fair-suppliers-page";

/**
 * Rota da tela de fornecedores da feira.
 * Esta página centraliza o cadastro e a importação dos fornecedores da feira.
 * A remessa PIX não é gerada aqui; esta tela apenas garante que os dados financeiros
 * e de PIX estejam corretos no sistema, preparando-os para geração futura da remessa.
 */
export default function FairSuppliersRoutePage() {
  const params = useParams<{ fairId?: string }>();
  const fairId = typeof params?.fairId === "string" ? params.fairId : "";

  return <FairSuppliersPage fairId={fairId} />;
}
