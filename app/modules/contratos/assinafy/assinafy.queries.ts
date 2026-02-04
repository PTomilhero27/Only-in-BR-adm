/**
 * Contratos > Assinafy (TanStack Query)
 *
 * Responsabilidade:
 * - Mutations para:
 *   1) upload do PDF do contrato
 *   2) gerar/reutilizar link de assinatura
 * - Invalidação para atualizar UI (tabela de expositores / status / hasPdf / link).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  UploadContractPdfInput,
  CreateAssinafySignUrlInput,
} from "./assinafy.schema"
import { uploadContractPdf, createAssinafySignUrl } from "./assinafy.service"

export const assinafyQueryKeys = {
  all: ["contracts", "assinafy"] as const,

  uploadPdf: () => [...assinafyQueryKeys.all, "upload-pdf"] as const,
  signUrl: () => [...assinafyQueryKeys.all, "sign-url"] as const,
}

/**
 * Upload do PDF do contrato.
 * Depois do upload, normalmente você quer:
 * - atualizar tabela de expositores (hasPdf)
 * - possivelmente habilitar o botão "Gerar link"
 */
export function useUploadContractPdfMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationKey: assinafyQueryKeys.uploadPdf(),
    mutationFn: (vars: { input: UploadContractPdfInput }) =>
      uploadContractPdf({ input: vars.input }),

    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["fairs", "exhibitors"] })
    },
  })
}


/**
 * Geração (ou reutilização) do link de assinatura.
 * Depois disso, você provavelmente quer:
 * - atualizar tabela de expositores (status AGUARDANDO_ASSINATURA)
 * - exibir o signUrl (copiar/abrir)
 */
export function useCreateAssinafySignUrlMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationKey: assinafyQueryKeys.signUrl(),
    mutationFn: (vars: { input: CreateAssinafySignUrlInput }) =>
      createAssinafySignUrl({ input: vars.input }),

    onSuccess: async () => {
      // ✅ Atualiza a tabela/visão para refletir status/links mais recentes
      await qc.invalidateQueries({ queryKey: ["fairs", "exhibitors"] })
    },
  })
}
