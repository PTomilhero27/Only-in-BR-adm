/**
 * Contratos > Assinafy (upload PDF + gerar link de assinatura)
 *
 * Responsabilidade:
 * - Centralizar chamadas HTTP para o backend.
 * - Garantir que payloads e respostas estejam validados via Zod.
 *
 * Observação importante:
 * - Upload usa multipart/form-data (FormData).
 * - Link de assinatura usa JSON (POST normal).
 */

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
 * POST /contracts/:contractId/pdf
 * Envia o PDF e metadados necessários para validação no backend.
 *
 * Por que contractId na rota?
 * - Evita salvar PDF no contrato errado.
 * - Facilita versionamento e rastreabilidade.
 * - Dá previsibilidade (1 upload => 1 instância).
 */
export async function uploadContractPdf(params: {
  input: UploadContractPdfInput
}): Promise<UploadContractPdfResponse> {
  const parsed = UploadContractPdfInputSchema.parse(params.input)

  const form = new FormData()
  form.append("file", parsed.file, parsed.file.name)
  form.append("fairId", parsed.fairId)
  form.append("ownerId", parsed.ownerId)
  form.append("templateId", parsed.templateId)

  const data = await api.post<UploadContractPdfResponse>(
    `contracts/${parsed.contractId}/pdf`,
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
