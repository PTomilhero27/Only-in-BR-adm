/**
 * Feiras > Contract Settings
 *
 * Responsabilidade:
 * - Centralizar chamada HTTP de vínculo do contrato principal da feira.
 * - Validar input/output com Zod.
 */
import { api } from "@/app/shared/http/api"
import {
  FairContractSettingsSchema,
  type FairContractSettings,
  UpsertFairContractSettingsInputSchema,
  type UpsertFairContractSettingsInput,
} from "./fair-contract-settings.schema"

/**
 * PUT /fairs/:fairId/contract-settings
 * Vincula ou troca o contrato principal da feira (upsert).
 */
export async function upsertFairContractSettings(params: {
  fairId: string
  input: UpsertFairContractSettingsInput
}): Promise<FairContractSettings> {
  const parsed = UpsertFairContractSettingsInputSchema.parse(params.input)
  const data = await api.patch(
    `fairs/${params.fairId}/contract-settings`,
    parsed,
  )
  return FairContractSettingsSchema.parse(data)
}
