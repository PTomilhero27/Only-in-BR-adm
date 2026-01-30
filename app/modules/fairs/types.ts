/**
 * Tipos do módulo de Feiras.
 * Mantemos alinhado ao contrato do backend (Swagger).
 *
 * Atualização:
 * - Capacidade de barracas por feira:
 *   - stallsCapacity
 *   - stallsReserved
 *   - stallsRemaining
 *
 * Compatibilidade:
 * - Algumas respostas podem trazer "createdByName" (string|null)
 *   em vez de "createdBy: { name }".
 */

export type FairStatus = 'ATIVA' | 'FINALIZADA' | 'CANCELADA'

export type CreatedBy = { name: string }

export type FairOccurrence = {
  id: string
  startsAt: string // ISO
  endsAt: string // ISO
}

/**
 * Resumo do vínculo de Formulário na feira.
 * Usado no admin para:
 * - ver rapidamente o que está habilitado
 * - contar "Formulários ativos" (enabled && active)
 * - gerar link e validar janela
 */
export type FairFormSummary = {
  slug: string
  name: string
  active: boolean // status global do Form
  enabled: boolean // status do Form nesta feira
  startsAt: string // ISO
  endsAt: string // ISO
}

export type Fair = {
  id: string
  name: string
  status: FairStatus
  address: string

  occurrences: FairOccurrence[]

  /**
   * ✅ Compatibilidade:
   * - preferencialmente usar createdByName (novo)
   * - createdBy pode existir em versões antigas
   */
  createdByName?: string | null
  createdBy?: CreatedBy

  createdAt: string
  updatedAt: string

  /**
   * ✅ Capacidade da feira e ocupação (derivada de OwnerFair.stallsQty).
   */
  stallsCapacity: number
  stallsReserved: number
  stallsRemaining: number

  /**
   * Contagens para o painel admin.
   */
  exhibitorsCount: number
  stallsQtyTotal: number

  /**
   * Forms vinculados na feira (resumo).
   */
  fairForms: FairFormSummary[]
}

export type CreateFairOccurrenceInput = {
  startsAt: string // ISO
  endsAt: string // ISO
}

export type CreateFairInput = {
  name: string
  status?: FairStatus
  address: string


  stallsCapacity: number

  occurrences: CreateFairOccurrenceInput[]
}

/**
 * Opcional, mas bem útil para o PATCH /fairs/:id
 * (Se você já tem esse tipo em outro arquivo, pode ignorar.)
 */
export type UpdateFairInput = {
  name?: string
  status?: FairStatus
  address?: string
  stallsCapacity?: number
}

export type ListFairsParams = {
  status?: FairStatus
}
