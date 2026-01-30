/**
 * Tipos/contratos do módulo "interests" (painel).
 * Motivo: evitar contratos implícitos com o backend, validando payload com Zod.
 */
import { z } from "zod"

/**
 * Item completo retornado pelo GET /interests (painel).
 * Decisão: o backend já entrega todos os dados para o modal,
 * evitando outra chamada.
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
   * ✅ NOVO
   * Indica se o interessado já possui acesso ao portal do expositor
   * com login/senha definidos.
   *
   * - true  => acesso ativo
   * - false => acesso ainda não liberado ou senha não criada
   * - undefined => backend ainda não implementou
   */
  hasPortalLogin: z.boolean().optional(),

  /**
   * ✅ NOVO
   * Quantidade de barracas cadastradas pelo expositor.
   *
   * Obs.: valor calculado no backend (COUNT).
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
 * Helpers de apresentação (1 lugar para regra de exibição).
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

/**
 * ✅ Helper novo (opcional)
 * Centraliza a lógica de exibição do status de acesso.
 */
export function interestAccessLabel(i: InterestListItem) {
  if (typeof i.hasPortalLogin !== "boolean") return "—"
  return i.hasPortalLogin ? "Com login" : "Sem login"
}
