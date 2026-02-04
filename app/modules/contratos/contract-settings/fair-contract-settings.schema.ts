/**
 * Feiras > Contract Settings
 *
 * Responsabilidade:
 * - Tipagem forte do vínculo do contrato principal da feira (FairContractSettings).
 * - Evitar contratos implícitos no front.
 */
import { z } from "zod"
import { DocumentTemplateStatusSchema } from "@/app/modules/contratos/document-templates/document-templates.schema"

export const FairContractTemplateLiteSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: DocumentTemplateStatusSchema,
  isAddendum: z.boolean(),
  updatedAt: z.string().datetime(),
})

export type FairContractTemplateLite = z.infer<typeof FairContractTemplateLiteSchema>

export const FairContractSettingsSchema = z.object({
  id: z.string(),
  fairId: z.string(),
  templateId: z.string(),
  updatedAt: z.string().datetime(),
  updatedByUserId: z.string().nullable(),
  template: FairContractTemplateLiteSchema,
})

export type FairContractSettings = z.infer<typeof FairContractSettingsSchema>

export const UpsertFairContractSettingsInputSchema = z.object({
  templateId: z.string().min(1, "Informe o templateId."),
})

export type UpsertFairContractSettingsInput = z.infer<
  typeof UpsertFairContractSettingsInputSchema
>
