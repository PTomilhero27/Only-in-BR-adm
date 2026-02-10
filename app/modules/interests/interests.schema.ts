/**
 * Tipos/contratos do módulo "interests" (painel).
 * Motivo: evitar contratos implícitos com o backend, validando payload com Zod.
 */
import { z } from "zod"

/**
 * Item completo retornado pelo GET /interests (painel).
 */
export const InterestListItemSchema = z.object({
  id: z.string(),
  personType: z.enum(["PF", "PJ"]),
  document: z.string(),

  fullName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),

  addressZipcode: z.string().nullable().optional(),
  addressFull: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),

  pixKey: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankAccountType: z.string().nullable().optional(),
  bankHolderDoc: z.string().nullable().optional(),
  bankHolderName: z.string().nullable().optional(),

  stallsDescription: z.string().nullable().optional(),

  /**
   * ✅ Indica se já existe login (passwordSetAt != null)
   */
  hasPortalLogin: z.boolean().optional(),

  /**
   * ✅ Quantidade de barracas cadastradas
   */
  stallsCount: z.number().int().min(0).optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type InterestListItem = z.infer<typeof InterestListItemSchema>

/**
 * Resposta paginada do GET /interests.
 */
export const InterestsListResponseSchema = z.object({
  items: z.array(InterestListItemSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
})

export type InterestsListResponse = z.infer<typeof InterestsListResponseSchema>

/**
 * Filtros suportados no painel (alinhado ao backend).
 */
export type InterestsFilters = {
  q?: string
  page?: number
  pageSize?: number
  sort?: "updatedAt_desc" | "createdAt_desc"
}

/**
 * Payload aceito no POST /interests/:ownerId/portal-access
 */
export const GrantPortalAccessPayloadSchema = z.object({
  expiresInMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
  type: z.enum(["ACTIVATE_ACCOUNT", "RESET_PASSWORD"]).optional(),
})

export type GrantPortalAccessPayload = z.infer<typeof GrantPortalAccessPayloadSchema>

/**
 * Resposta do POST /interests/:ownerId/portal-access
 *
 * ✅ Ajuste importante:
 * - Agora inclui `token` (raw) para o admin copiar e repassar.
 */
export const GrantPortalAccessResponseSchema = z.object({
  ownerId: z.string(),
  userId: z.string(),
  tokenType: z.enum(["ACTIVATE_ACCOUNT", "RESET_PASSWORD"]),
  expiresAt: z.string(),
  activationLink: z.string().url(),
  token: z.string(), // ✅ novo
})

export type GrantPortalAccessResponse = z.infer<typeof GrantPortalAccessResponseSchema>

/**
 * Resposta do POST /interests/:ownerId/password-reset-token
 * (atalho no admin)
 *
 * Se você manter esse endpoint separado, padronizamos o contrato para:
 * - token (raw)
 * - expiresAt
 * - resetUrl
 */
export const PasswordResetTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  resetUrl: z.string().url(),
})

export type PasswordResetTokenResponse = z.infer<typeof PasswordResetTokenResponseSchema>

/**
 * Helpers de apresentação.
 */
export function interestDisplayName(i: InterestListItem) {
  return i.fullName?.trim() || "-"
}

export function interestDisplayLocation(i: InterestListItem) {
  const city = i.addressCity?.trim()
  const st = i.addressState?.trim()
  if (city && st) return `${city}/${st}`
  return city || st || "—"
}

export function interestDisplayDate(i: InterestListItem) {
  return i.updatedAt ?? i.createdAt
}

export function interestAccessLabel(i: InterestListItem) {
  if (typeof i.hasPortalLogin !== "boolean") return "—"
  return i.hasPortalLogin ? "Com login" : "Sem login"
}
