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

export function useCreateAssinafySignUrlMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationKey: assinafyQueryKeys.signUrl(),
    mutationFn: (vars: { input: CreateAssinafySignUrlInput }) =>
      createAssinafySignUrl({ input: vars.input }),

    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["fairs", "exhibitors"] })
    },
  })
}
