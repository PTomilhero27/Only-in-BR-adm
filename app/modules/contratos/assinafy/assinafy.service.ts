import { api } from "@/app/shared/http/api"
import {
  UploadContractPdfInputSchema,
  type UploadContractPdfInput,
  UploadContractPdfResponseSchema,
  type UploadContractPdfResponse,
  CreateAssinafySignUrlInputSchema,
  type CreateAssinafySignUrlInput,
  CreateAssinafySignUrlResponseSchema,
  type CreateAssinafySignUrlResponse,
} from "./assinafy.schema"

/**
 * POST /contracts/templates/:templateId/pdf
 * Upload do PDF (multipart/form-data).
 *
 * - templateId vai na rota
 * - contractId é opcional no body (FormData)
 * - se não tiver contractId, backend cria/acha (OwnerFair 1:1)
 */
export async function uploadContractPdf(params: {
  input: UploadContractPdfInput
}): Promise<UploadContractPdfResponse> {
  const parsed = UploadContractPdfInputSchema.parse(params.input)

  const form = new FormData()
  form.append("file", parsed.file, parsed.file.name)
  form.append("fairId", parsed.fairId)
  form.append("ownerId", parsed.ownerId)

  // ✅ só manda se existir (NUNCA mandar "")
  if (parsed.contractId) {
    form.append("contractId", parsed.contractId)
  }

  const data = await api.post<UploadContractPdfResponse>(
    `contracts/templates/${parsed.templateId}/pdf`,
    form,
    {
      responseSchema: UploadContractPdfResponseSchema,
    }
  )

  return data
}

/**
 * POST /contracts/assinafy/sign-url
 */
export async function createAssinafySignUrl(params: {
  input: CreateAssinafySignUrlInput
}): Promise<CreateAssinafySignUrlResponse> {
  const parsed = CreateAssinafySignUrlInputSchema.parse(params.input)

  const data = await api.post<CreateAssinafySignUrlResponse>(
    "contracts/assinafy/sign-url",
    parsed,
    {
      responseSchema: CreateAssinafySignUrlResponseSchema,
    }
  )

  return data
}
