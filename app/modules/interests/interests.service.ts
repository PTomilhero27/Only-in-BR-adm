/**
 * Service do painel para consumir Interests.
 * Motivo: centralizar querystring e contrato.
 */
import {
  InterestsListResponseSchema,
  type InterestsFilters,
  type InterestsListResponse,
} from "./interests.schema"
import { api } from "@/app/shared/http/api"
import { z } from "zod"

/**
 * Monta a query string apenas com params definidos.
 * Motivo: evitar URLs poluídas e comportamento confuso no backend.
 */
function toQueryString(filters: InterestsFilters) {
  const params = new URLSearchParams()

  if (filters.q) params.set("q", filters.q)

  params.set("page", String(filters.page ?? 1))
  params.set("pageSize", String(filters.pageSize ?? 20))

  if (filters.sort) params.set("sort", filters.sort)

  return params.toString()
}

/**
 * Lista interessados (painel).
 */
export async function listInterests(filters: InterestsFilters): Promise<InterestsListResponse> {
  const qs = toQueryString(filters)
  return api.get(`interests?${qs}`, InterestsListResponseSchema)
}

/**
 * Payload para gerar link temporário de acesso ao portal do expositor.
 * Decisão:
 * - expiresInMinutes restrito a 30/60
 * - type preparado para reuso futuro (RESET_PASSWORD)
 */
export type GrantPortalAccessPayload = {
  expiresInMinutes?: 30 | 60
  type?: "ACTIVATE_ACCOUNT" | "RESET_PASSWORD"
}

/**
 * Resposta do backend ao gerar link temporário.
 * Motivo: garantir contrato estável no modal.
 */
export const GrantPortalAccessResponseSchema = z.object({
  ownerId: z.string(),
  userId: z.string(),
  tokenType: z.enum(["ACTIVATE_ACCOUNT", "RESET_PASSWORD"]),
  expiresAt: z.string(),
  activationLink: z.string().url(),
})

export type GrantPortalAccessResponse = z.infer<typeof GrantPortalAccessResponseSchema>

/**
 * Gera link temporário para o expositor criar senha (primeiro acesso) ou recuperar senha (futuro).
 *
 * Importante:
 * - Endpoint autenticado (painel).
 * - Retorna link com token "raw" para copiar/compartilhar.
 */
export async function grantPortalAccess(
  ownerId: string,
  payload: GrantPortalAccessPayload = { expiresInMinutes: 60, type: "ACTIVATE_ACCOUNT" },
): Promise<GrantPortalAccessResponse> {
  return api.post(`interests/${ownerId}/portal-access`, payload )
}
