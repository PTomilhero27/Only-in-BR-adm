/**
 * Service responsável por consumir as rotas de vínculo Interessado ↔ Feira.
 * Motivo: manter contrato e parsing centralizados, evitando fetch espalhado.
 */

import { api } from "@/app/shared/http/api"
import {
  ListInterestFairsResponseSchema,
  type LinkInterestToFairInput,
  type UpdateInterestFairInput,
} from "./types"

export async function listInterestFairs(ownerId: string) {
  return api.get(`interests/${ownerId}/fairs`, ListInterestFairsResponseSchema)
}

export async function linkInterestToFair(ownerId: string, input: LinkInterestToFairInput) {
  // Se quiser validar a resposta do create depois, criamos um schema para OwnerFair.
  return api.post(`interests/${ownerId}/fairs`, input)
}

export async function updateInterestFair(
  ownerId: string,
  fairId: string,
  input: UpdateInterestFairInput,
) {
  return api.patch(`interests/${ownerId}/fairs/${fairId}`, input)
}

export async function unlinkInterestFromFair(ownerId: string, fairId: string) {
  return api.delete(`interests/${ownerId}/fairs/${fairId}`)
}
