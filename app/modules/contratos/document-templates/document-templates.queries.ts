/**
 * Contratos > Document Templates
 *
 * Responsabilidade:
 * - Padronizar keys de cache do TanStack Query.
 * - Encapsular queries/mutations com invalidação consistente.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CreateDocumentTemplateInput,
  ListDocumentTemplatesQuery,
  UpdateDocumentTemplateInput,
} from "./document-templates.schema"
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplateById,
  listDocumentTemplates,
  updateDocumentTemplate,
} from "./document-templates.service"

export const documentTemplatesQueryKeys = {
  all: ["contracts", "document-templates"] as const,

  /**
   * Incluímos filtros no key para cache separado por variação de lista.
   * Ex.: lista summary vs full (se algum dia você usar) ou publicados vs rascunhos.
   */
  list: (filters?: ListDocumentTemplatesQuery) =>
    ["contracts", "document-templates", "list", { ...(filters ?? {}) }] as const,

  byId: (id: string) => ["contracts", "document-templates", "byId", { id }] as const,
}

export function useDocumentTemplatesQuery(filters?: ListDocumentTemplatesQuery) {
  return useQuery({
    queryKey: documentTemplatesQueryKeys.list(filters),
    queryFn: () => listDocumentTemplates(filters),
  })
}

export function useDocumentTemplateQuery(id: string) {
  return useQuery({
    queryKey: documentTemplatesQueryKeys.byId(id),
    queryFn: () => getDocumentTemplateById(id),
    enabled: !!id,
  })
}

/**
 * POST /document-templates
 * Invalida todas as listas de templates após criação.
 */
export function useCreateDocumentTemplateMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateDocumentTemplateInput) => createDocumentTemplate(input),

    /**
     * Decisão: qualquer criação impacta listagens e combos.
     */
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: documentTemplatesQueryKeys.all })
    },
  })
}

/**
 * PATCH /document-templates/:id
 * Invalida listas e o item (byId) específico.
 */
export function useUpdateDocumentTemplateMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (vars: { id: string; input: UpdateDocumentTemplateInput }) =>
      updateDocumentTemplate({ id: vars.id, input: vars.input }),

    onSettled: async (_data, _err, vars) => {
      await qc.invalidateQueries({ queryKey: documentTemplatesQueryKeys.all })

      if (vars?.id) {
        await qc.invalidateQueries({
          queryKey: documentTemplatesQueryKeys.byId(vars.id),
        })
      }
    },
  })
}

/**
 * DELETE /document-templates/:id
 * Invalida listas e remove cache do item.
 */
export function useDeleteDocumentTemplateMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDocumentTemplate(id),

    onSettled: async (_data, _err, id) => {
      await qc.invalidateQueries({ queryKey: documentTemplatesQueryKeys.all })

      if (id) {
        qc.removeQueries({ queryKey: documentTemplatesQueryKeys.byId(id) })
      }
    },
  })
}
