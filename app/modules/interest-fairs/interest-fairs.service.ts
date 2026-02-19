// src/modules/interest-fairs/interest-fairs.service.ts
import { api } from "@/app/shared/http/api";
import {
  ListInterestFairsResponseSchema,
  type LinkInterestToFairInput,
  type PatchOwnerFairPurchasesInput,
  type UpdateStallFairTaxInput,
} from "./interest-fairs.schema";

/**
 * ✅ Interest Fairs (Admin) - HTTP client
 *
 * Responsabilidade:
 * - Centralizar chamadas do front para o módulo InterestFairs (ADMIN)
 * - Evitar contratos implícitos: tipar/validar respostas com Zod quando necessário
 */

/**
 * Lista vínculos do owner com feiras (inclui purchases e stalls vinculadas).
 * GET /interests/:ownerId/fairs
 */
export async function listInterestFairs(ownerId: string) {
  return api.get(`interests/${ownerId}/fairs`, ListInterestFairsResponseSchema);
}

/**
 * Cria vínculo Owner↔Fair + purchases (linhas 1 por 1) + installments.
 * POST /interests/:ownerId/fairs
 */
export async function linkInterestToFair(
  ownerId: string,
  input: LinkInterestToFairInput,
) {
  return api.post(`interests/${ownerId}/fairs`, input);
}

/**
 * Remove vínculo Owner↔Fair.
 * DELETE /interests/:ownerId/fairs/:fairId
 */
export async function unlinkInterestFromFair(ownerId: string, fairId: string) {
  return api.delete(`interests/${ownerId}/fairs/${fairId}`);
}

/**
 * Substitui todas as compras do vínculo (replace total).
 * PATCH /interests/:ownerId/fairs/:fairId/purchases
 */
export async function patchOwnerFairPurchases(
  ownerId: string,
  fairId: string,
  input: PatchOwnerFairPurchasesInput,
) {
  return api.patch(`interests/${ownerId}/fairs/${fairId}/purchases`, input);
}

/**
 * ✅ Define a taxa aplicada a UMA barraca vinculada na feira (StallFair).
 * PATCH /interests/:ownerId/fairs/:fairId/stalls/:stallFairId/tax
 * Body: { taxId }
 */
export async function patchStallFairTax(
  ownerId: string,
  fairId: string,
  stallFairId: string,
  input: UpdateStallFairTaxInput,
) {
  return api.patch(
    `interests/${ownerId}/fairs/${fairId}/stalls/${stallFairId}/tax`,
    input,
  );
}
