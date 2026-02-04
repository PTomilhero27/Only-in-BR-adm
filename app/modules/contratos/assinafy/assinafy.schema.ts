import { z } from "zod"

/**
 * -------------------------
 * UPLOAD DO PDF
 * -------------------------
 * - templateId: vai na rota
 * - contractId: opcional no body
 */
export const UploadContractPdfInputSchema = z.object({
  templateId: z.string().min(1, "Informe o templateId."),
  fairId: z.string().min(1, "Informe o fairId."),
  ownerId: z.string().min(1, "Informe o ownerId."),
  contractId: z.string().min(1).optional(), // ✅ agora opcional
  file: z.instanceof(File),
})

export type UploadContractPdfInput = z.infer<typeof UploadContractPdfInputSchema>

/**
 * Resposta do backend após salvar PDF.
 * - contractId sempre volta (criado ou existente)
 */
export const UploadContractPdfResponseSchema = z.object({
  contractId: z.string().min(1), // ✅ não nullable
  pdfPath: z.string().min(1),
  signedUrl: z.string().url().optional(),
})

export type UploadContractPdfResponse = z.infer<
  typeof UploadContractPdfResponseSchema
>

/**
 * -------------------------
 * GERAR LINK DE ASSINATURA
 * -------------------------
 */
export const CreateAssinafySignUrlInputSchema = z.object({
  fairId: z.string().min(1, "Informe o fairId."),
  ownerId: z.string().min(1, "Informe o ownerId."),
  name: z.string().min(2, "Informe o nome do signatário."),
  email: z.string().email("Informe um e-mail válido."),
  brand: z.string().min(1).optional(),
  expiresAtISO: z.string().datetime().optional(),
})

export type CreateAssinafySignUrlInput = z.infer<
  typeof CreateAssinafySignUrlInputSchema
>

export const CreateAssinafySignUrlResponseSchema = z.object({
  signUrl: z.string().url(),
  contractId: z.string().min(1),
  assinafyDocumentId: z.string().min(1),
  assinafySignerId: z.string().min(1),
  reused: z.boolean(),
})

export type CreateAssinafySignUrlResponse = z.infer<
  typeof CreateAssinafySignUrlResponseSchema
>
