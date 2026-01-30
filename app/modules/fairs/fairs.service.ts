/**
 * Service do módulo Fairs.
 * Responsabilidade:
 * - Centralizar chamadas HTTP (POST/PATCH) e parsing dos contratos.
 */

import { api } from "@/app/shared/http/api";
import { Fair, FairStatus } from "./types";
import { CreateFairRequest, createFairRequestSchema, fairResponseSchema, listFairsResponseSchema, UpdateFairRequest, updateFairRequestSchema } from "./fairs.schemas";

export async function createFair(payload: CreateFairRequest) {
  return api.post("fairs", payload, {
    requestSchema: createFairRequestSchema,
    responseSchema: fairResponseSchema,
  });
}


export async function updateFair(fairId: string, payload: UpdateFairRequest): Promise<Fair> {
  const body = updateFairRequestSchema.parse(payload);

  const data = await api.patch(`fairs/${fairId}`, body);
  return fairResponseSchema.parse(data);
}

export async function listFairs(params?: { status?: FairStatus }) {
  const query = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  const data = await api.get(`fairs${query}`);
  return listFairsResponseSchema.parse(data);
}
