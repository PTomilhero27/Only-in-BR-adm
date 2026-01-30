"use client";

/**
 * Container da listagem de contratos (templates).
 *
 * Responsabilidade:
 * - Buscar templates em modo summary (leve).
 * - Exibir lista estilo "menu" (linhas grandes).
 * - Abrir modal de criação e redirecionar para edição após criar.
 */

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  useCreateDocumentTemplateMutation,
  useDocumentTemplatesQuery,
} from "@/app/modules/contratos/document-templates/document-templates.queries";

import { CreateTemplateDialog } from "./create-template-dialog";
import { EmptyState } from "./empty-state";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Spinner } from "@/components/ui/spinner";
import { TemplatesGrid } from "./templates-grid";

export function ContractsPage() {
  const router = useRouter();

  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState("");

  /**
   * Decisão: listar em modo summary para ficar leve e rápido.
   * (sem content) + usage.fairsCount.
   */
  const { data, isLoading } = useDocumentTemplatesQuery({
    mode: "summary",
  });

  const createMutation = useCreateDocumentTemplateMutation();

  const hasItems = (data?.length ?? 0) > 0;
  const canSave = useMemo(() => title.trim().length > 0, [title]);

  async function handleCreate() {
    if (!canSave) return;

    const created = await createMutation.mutateAsync({
      title: title.trim(),

      /**
       * Valores iniciais coerentes com seu back:
       * - contrato principal por padrão
       * - ficha cadastral ligada por padrão (pode ajustar no editor depois)
       * - rascunho por padrão
       * - content começa vazio (o editor vai preencher)
       */
      isAddendum: false,
      hasRegistration: true,
      status: "DRAFT",

      // ✅ FIX: schema exige version + blocks
      content: { version: 1, blocks: [] },
    });

    setOpenCreate(false);
    setTitle("");

    // Após criar, vai direto para a tela de edição.
    router.push(`/contratos/${created.id}`);
  }

  return (
    <div className="space-y-6 p-6">
      <AppBreadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Contratos" },
        ]}
      />

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Templates de contratos e aditivos usados nas feiras. Crie, edite e publique versões.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setOpenCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar contrato
          </Button>
        </div>
      </header>

      {/* Loading simples */}
      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border p-6 text-sm text-muted-foreground">
          Carregando templates <Spinner />
        </div>
      )}

      {!isLoading && !hasItems && <EmptyState onCreate={() => setOpenCreate(true)} />}

      {!isLoading && hasItems && data && <TemplatesGrid templates={data} />}

      <CreateTemplateDialog
        open={openCreate}
        onOpenChange={(next) => {
          setOpenCreate(next);
          if (!next) setTitle("");
        }}
        titleValue={title}
        onTitleChange={setTitle}
        onSave={handleCreate}
        isSaving={createMutation.isPending}
        canSave={canSave}
      />
    </div>
  );
}
