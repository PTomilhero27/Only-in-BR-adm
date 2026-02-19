/**
 * Tipos do módulo de Feiras.
 * Alinhado ao contrato do backend (Swagger).
 *
 * Atualização:
 * - Capacidade de barracas:
 *   - stallsCapacity, stallsReserved, stallsRemaining
 *
 * - ✅ Taxes (taxas percentuais por feira):
 *   - taxes[]
 *   - cada compra (OwnerFairPurchase) pode apontar taxId
 *
 * Compatibilidade:
 * - createdByName pode vir direto
 * - createdBy (objeto) pode vir ou não
 * - taxes podem vir SEM fairId (depende do serializer do backend)
 */

export type FairStatus = "ATIVA" | "FINALIZADA" | "CANCELADA";

export type CreatedBy = { name: string };

export type FairOccurrence = {
  id: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
};

/**
 * Resumo do vínculo de Formulário na feira.
 */
export type FairFormSummary = {
  slug: string;
  name: string;
  active: boolean;
  enabled: boolean;
  startsAt: string; // ISO
  endsAt: string; // ISO
};

/**
 * ✅ Taxa percentual da feira.
 * - percentBps: 10000 = 100.00%
 * - Ex.: 5.00% => 500
 *
 * Observação:
 * - fairId pode não vir em alguns retornos (depende do backend),
 *   então mantemos opcional.
 */
export type FairTax = {
  id: string;
  fairId?: string;
  name: string;
  percentBps: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Input para criar/editar taxas junto da feira.
 * - create: sem id
 * - update: com id
 */
export type FairTaxUpsertInput = {
  id?: string;
  name: string;
  percentBps: number;
  isActive?: boolean;
};

export type Fair = {
  id: string;
  name: string;
  status: FairStatus;
  address: string;

  occurrences: FairOccurrence[];

  createdByName?: string | null;
  createdBy?: CreatedBy;

  createdAt: string;
  updatedAt: string;

  stallsCapacity: number;
  stallsReserved: number;
  stallsRemaining: number;

  exhibitorsCount: number;
  stallsQtyTotal: number;

  fairForms: FairFormSummary[];

  /**
   * ✅ taxes configuradas na feira
   */
  taxes: FairTax[];
};

export type CreateFairOccurrenceInput = {
  startsAt: string; // ISO
  endsAt: string; // ISO
};

export type CreateFairInput = {
  name: string;
  status?: FairStatus;
  address: string;
  stallsCapacity: number;
  occurrences: CreateFairOccurrenceInput[];

  /**
   * ✅ Taxes no create
   */
  taxes?: FairTaxUpsertInput[];
};

/**
 * PATCH /fairs/:id
 */
export type UpdateFairInput = {
  name?: string;
  status?: FairStatus;
  address?: string;
  stallsCapacity?: number;

  /**
   * ✅ Taxes no patch
   */
  taxes?: FairTaxUpsertInput[];
};

export type ListFairsParams = {
  status?: FairStatus;
};
