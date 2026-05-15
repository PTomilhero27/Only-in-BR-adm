/**
 * Contratos > Contracts (CRUD de instâncias)
 *
 * Responsabilidade:
 * - Centralizar chamadas HTTP para o backend (CRUD de contratos multi-tipo).
 * - Validar inputs com Zod antes de enviar.
 *
 * Endpoints:
 * - POST   /contracts
 * - GET    /contracts/fair/:fairId
 * - GET    /contracts/owner/:ownerId
 * - GET    /contracts/:id
 * - POST   /contracts/:id/fair-links
 * - DELETE /contracts/:id/fair-links/:fairId
 * - DELETE /contracts/:id
 */
import { api } from "@/app/shared/http/api"
import {
  CreateContractInputSchema,
  type CreateContractInput,
  ContractListResponseSchema,
  type ContractListResponse,
  ContractDetailSchema,
  type ContractDetail,
  AddFairLinkInputSchema,
  type AddFairLinkInput,
  type ContractFairLink,
  ContractFairLinkSchema,
} from "./contracts.schema"

/**
 * POST /contracts
 * Cria um novo contrato (qualquer tipo).
 */
export async function createContract(input: CreateContractInput): Promise<ContractDetail> {
  const parsed = CreateContractInputSchema.parse(input)
  return api.post<ContractDetail>("contracts", parsed)
}

/**
 * GET /contracts/fair/:fairId
 * Lista todos os contratos de uma feira.
 */
export async function listContractsByFair(fairId: string): Promise<ContractListResponse> {
  const data = await api.get<ContractListResponse>(`contracts/fair/${fairId}`)
  return ContractListResponseSchema.parse(data)
}

/**
 * GET /contracts/owner/:ownerId
 * Lista todos os contratos de um expositor em todas as feiras.
 */
export async function listContractsByOwner(ownerId: string): Promise<ContractListResponse> {
  const data = await api.get<ContractListResponse>(`contracts/owner/${ownerId}`)
  return ContractListResponseSchema.parse(data)
}

/**
 * GET /contracts/:id
 * Busca um contrato completo (com template, fair links, etc).
 */
export async function getContractById(id: string): Promise<ContractDetail> {
  const data = await api.get<ContractDetail>(`contracts/${id}`)
  return ContractDetailSchema.parse(data)
}

/**
 * POST /contracts/:id/fair-links
 * Adiciona uma feira ao contrato MULTI_FAIR.
 */
export async function addFairLink(
  contractId: string,
  input: AddFairLinkInput,
): Promise<ContractFairLink> {
  const parsed = AddFairLinkInputSchema.parse(input)
  return api.post<ContractFairLink>(`contracts/${contractId}/fair-links`, parsed)
}

/**
 * DELETE /contracts/:id/fair-links/:fairId
 * Remove uma feira do contrato MULTI_FAIR.
 */
export async function removeFairLink(contractId: string, fairId: string): Promise<void> {
  await api.delete(`contracts/${contractId}/fair-links/${fairId}`)
}

/**
 * DELETE /contracts/:id
 * Exclui um contrato (somente se não tiver assinatura ou fluxo ativo).
 */
export async function deleteContract(id: string): Promise<void> {
  await api.delete(`contracts/${id}`)
}
