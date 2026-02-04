"use client"

/**
 * ContractPreviewContext
 *
 * Responsabilidade:
 * - Guardar em memória (client-side) os dados do expositor selecionado
 *   para a futura tela de "Visualização do contrato".
 *
 * Por que isso existe?
 * - A tela de contrato precisa de dados "ricos" (expositor + barracas + slots etc)
 *   para preencher o documento sem depender de múltiplas chamadas.
 *
 * Observação:
 * - Este contexto NÃO substitui o backend (fonte de verdade),
 *   ele apenas evita retrabalho e garante que a UX da página de contrato
 *   seja imediata e consistente.
 */

import * as React from "react"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

export type ContractPreviewPayload = {
  fairId: string
  ownerFairId: string

  /**
   * ✅ Dados do expositor para preencher o contrato:
   * - owner (nome, doc, endereço, banco, pix)
   * - barracas vinculadas e slots comprados
   * - status / assinatura etc
   */
  exhibitor: FairExhibitorRow
}

type ContractPreviewContextValue = {
  payload: ContractPreviewPayload | null
  setPayload: (next: ContractPreviewPayload | null) => void
}

const ContractPreviewContext = React.createContext<ContractPreviewContextValue | null>(null)

export function ContractPreviewProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = React.useState<ContractPreviewPayload | null>(null)

  return (
    <ContractPreviewContext.Provider value={{ payload, setPayload }}>
      {children}
    </ContractPreviewContext.Provider>
  )
}

export function useContractPreview() {
  const ctx = React.useContext(ContractPreviewContext)
  if (!ctx) {
    throw new Error("useContractPreview deve ser usado dentro de <ContractPreviewProvider />.")
  }
  return ctx
}
