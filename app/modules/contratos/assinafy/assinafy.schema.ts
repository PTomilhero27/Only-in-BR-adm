/**
 * Contratos > Assinafy (upload PDF + gerar link de assinatura)
 *
 * Responsabilidade:
 * - Tipagem/validação forte das operações Assinafy.
 * - Evitar contratos implícitos no front (tudo validado via Zod).
 */

import { z } from "zod"

/**
 * -------------------------
 * UPLOAD DO PDF
 * -------------------------
 * Input do upload:
 * - contractId: instância do contrato (Contract.id) ✅ agora vem na rota
 * - fairId: feira atual
 * - ownerId: expositor (Owner.id)
 * - templateId: template do contrato (DocumentTemplate.id)
 * - file: PDF gerado (File)
 */
export const UploadContractPdfInputSchema = z.object({
  contractId: z.string().min(1, "Informe o contractId."),
  fairId: z.string().min(1, "Informe o fairId."),
  ownerId: z.string().min(1, "Informe o ownerId."),
  templateId: z.string().min(1, "Informe o templateId."),
  file: z.instanceof(File),
})

export type UploadContractPdfInput = z.infer<typeof UploadContractPdfInputSchema>

/**
 * Resposta do backend após salvar no Storage + persistir Contract.pdfPath
 * - signedUrl pode vir para debug/validação imediata (opcional)
 */
export const UploadContractPdfResponseSchema = z.object({
  contractId: z.string().min(1),
  pdfPath: z.string().min(1),
  signedUrl: z.string().url().optional(),
})

export type UploadContractPdfResponse = z.infer<typeof UploadContractPdfResponseSchema>

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

export type CreateAssinafySignUrlInput = z.infer<typeof CreateAssinafySignUrlInputSchema>

export const CreateAssinafySignUrlResponseSchema = z.object({
  signUrl: z.string().url(),
  contractId: z.string().min(1),
  assinafyDocumentId: z.string().min(1),
  assinafySignerId: z.string().min(1),
  reused: z.boolean(),
})

export type CreateAssinafySignUrlResponse = z.infer<typeof CreateAssinafySignUrlResponseSchema>
