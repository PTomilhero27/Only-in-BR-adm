/**
 * Service do painel para consumir Interests.
 * Motivo: centralizar querystring e contrato.
 */
import {
  InterestsListResponseSchema,
  type InterestsFilters,
  type InterestsListResponse,
  GrantPortalAccessPayloadSchema,
  type GrantPortalAccessPayload,
  GrantPortalAccessResponseSchema,
  type GrantPortalAccessResponse,
  PasswordResetTokenResponseSchema,
  type PasswordResetTokenResponse,
} from "./interests.schema"

import { api } from "@/app/shared/http/api"

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
 * Gera link temporário para o expositor criar senha (primeiro acesso) ou recuperar senha.
 *
 * Importante:
 * - Endpoint autenticado (painel).
 * - Retorna link + token raw para copiar/compartilhar.
 */
export async function grantPortalAccess(
  ownerId: string,
  payload: GrantPortalAccessPayload = { expiresInMinutes: 60, type: "ACTIVATE_ACCOUNT" },
): Promise<GrantPortalAccessResponse> {
  // ✅ valida payload localmente para evitar mandar lixo pro backend
  const parsed = GrantPortalAccessPayloadSchema.parse(payload)

  return api.post(
    `interests/${ownerId}/portal-access`,
    parsed
  )
}

/**
 * Atalho do admin: gera token/link de reset de senha.
 *
 * Observação:
 * - Esse endpoint é opcional; você poderia usar grantPortalAccess com type=RESET_PASSWORD.
 * - Mantemos porque facilita o botão "Resetar senha" na UI.
 */
export async function createPasswordResetToken(
  ownerId: string,
): Promise<PasswordResetTokenResponse> {
  return api.post(
    `interests/${ownerId}/password-reset-token`,
    {}
  )
}
