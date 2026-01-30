import { z } from "zod"
import {
  FairFormItemSchema,
  ListFairFormsResponseSchema,
  UpsertFairFormPayloadSchema,
} from "./fair-forms.schemas"

export type FairFormItem = z.infer<typeof FairFormItemSchema>
export type ListFairFormsResponse = z.infer<typeof ListFairFormsResponseSchema>
export type UpsertFairFormPayload = z.infer<typeof UpsertFairFormPayloadSchema>
