import type { ReactNode } from "react"
import { ContractPreviewProvider } from "./barracas/context/contract-preview-context"

/**
 * Layout da Feira (nível: /feiras/[fairId])
 *
 * Responsabilidade:
 * - Envolver todas as subrotas da feira com providers necessários ao domínio.
 *
 * Decisão:
 * - ContractPreviewProvider precisa viver aqui para manter o contexto entre:
 *   - /feiras/[fairId]/barracas
 *   - /feiras/[fairId]/barracas/contrato/[contractId]
 */
export default function FairLayout({ children }: { children: ReactNode }) {
  return <ContractPreviewProvider>{children}</ContractPreviewProvider>
}
