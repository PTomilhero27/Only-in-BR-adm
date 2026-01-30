import type { ListFairFormsResponse, UpsertFairFormPayload } from "./fair-forms.types"
import { ListFairFormsResponseSchema, UpsertFairFormPayloadSchema } from "./fair-forms.schemas"
import { api } from "@/app/shared/http/api"

/**
 * Service do módulo FairForms.
 * Responsabilidade:
 * - Centralizar chamadas ao backend relacionadas a FairForm (admin).
 * - Garantir contrato explícito com Zod (request/response).
 */
export const fairFormsService = {
  async listByFairId(fairId: string): Promise<ListFairFormsResponse> {
    return api.get(`fairs/${fairId}/forms`, ListFairFormsResponseSchema)
  },

  async upsertByFairIdAndSlug(args: {
    fairId: string
    slug: string
    payload: UpsertFairFormPayload
  }) {
    const payload = UpsertFairFormPayloadSchema.parse(args.payload)

    // PATCH porque seu wrapper já tem patch e é o caso de "atualizar configuração"
    return api.patch(`fairs/${args.fairId}/forms/${args.slug}`, payload)
  },
}
