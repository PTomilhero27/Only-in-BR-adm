"use client";

/**
 * Página de edição do template.
 * Responsabilidade:
 * - Buscar o template full (com content).
 * - Orquestrar save draft / publish / toggles.
 * - Renderizar o editor shell (UI principal).
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDeleteDocumentTemplateMutation, useDocumentTemplateQuery, useUpdateDocumentTemplateMutation } from "@/app/modules/contratos/document-templates/document-templates.queries";
import { DocumentTemplateStatus } from "@/app/modules/contratos/document-templates/document-templates.schema";
import { ContractEditorShell } from "../../components/contract-editor-shell";



export function ContractTemplatePage({ templateId }: { templateId: string }) {
  const router = useRouter();

  const { data, isLoading } = useDocumentTemplateQuery(templateId);

  const updateMutation = useUpdateDocumentTemplateMutation();
  const deleteMutation = useDeleteDocumentTemplateMutation();

  /**
   * Estado local do editor (fonte para interação rápida).
   * Decisão: ao carregar do backend, inicializa local.
   */
  const [local, setLocal] = useState<any>(null);

  const template = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      content: local ?? data.content,
    };
  }, [data, local]);

  async function patch(input: any) {
    await updateMutation.mutateAsync({
      id: templateId,
      input,
    });
  }

  async function handleSaveDraft() {
    if (!template) return;

    await patch({
      status: "DRAFT" as DocumentTemplateStatus,
      content: template.content,
    });
  }

  async function handlePublish() {
    if (!template) return;

    await patch({
      status: "PUBLISHED" as DocumentTemplateStatus,
      content: template.content,
    });
  }

  async function handleToggleRegistration(next: boolean) {
    await patch({ hasRegistration: next });
  }

  async function handleToggleAddendum(next: boolean) {
    await patch({ isAddendum: next });
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(templateId);
    router.push("/contratos");
  }

  return (
    <div className="p-6">
      <ContractEditorShell
        mode="edit"
        template={template}
        isLoading={isLoading}
        onChange={(nextContent) => setLocal(nextContent)}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onDelete={handleDelete}
        onToggleAddendum={handleToggleAddendum}
        onToggleRegistration={handleToggleRegistration}
        isSaving={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
