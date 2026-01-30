"use client";

/**
 * Página de criação de contrato (template).
 * Responsabilidade:
 * - Abrir modal de criação (título).
 * - Criar template no backend e redirecionar para edição.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateTemplateDialog } from "../../components/create-template-dialog";
import { useCreateDocumentTemplateMutation } from "@/app/modules/contratos/document-templates/document-templates.queries";
import { ContractEditorShell } from "../../components/contract-editor-shell";


export function NewContractPage() {
  const router = useRouter();
  const createMutation = useCreateDocumentTemplateMutation();

  const [openCreate, setOpenCreate] = useState(true);
  const [title, setTitle] = useState("");

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  useEffect(() => {
    // Quando o usuário fecha o modal sem criar, volta para listagem.
    if (!openCreate && !createMutation.isPending) {
      router.push("/contratos");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreate]);

  async function handleCreate() {
    if (!canSave) return;

    const created = await createMutation.mutateAsync({
      title: title.trim(),
      isAddendum: false,
      hasRegistration: true,
      status: "DRAFT",

      /**
       * Começamos com um JSON base para o editor.
       * Depois o editor vai gerenciar blocos (cláusula, texto livre, etc).
       */
      content: {
        version: 1,
        blocks: [],
      },
    });

    router.replace(`/contratos/${created.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Mostra uma estrutura mínima (sem dados ainda) para o usuário não sentir “tela vazia” */}
      <ContractEditorShell
        mode="create"
        template={{
          id: "new",
          title: title || "Novo contrato",
          isAddendum: false,
          hasRegistration: true,
          status: "DRAFT",
          content: { version: 1, blocks: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        isLoading={false}
        onChange={() => {}}
        onSaveDraft={async () => {}}
        onPublish={async () => {}}
        onDelete={async () => {}}
        onToggleAddendum={async () => {}}
        onToggleRegistration={async () => {}}
        disableActions
      />

      <CreateTemplateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        titleValue={title}
        onTitleChange={setTitle}
        canSave={canSave}
        isSaving={createMutation.isPending}
        onSave={handleCreate}
      />
    </div>
  );
}
