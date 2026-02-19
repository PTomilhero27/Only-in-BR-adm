"use client";

/**
 * Editor Shell (Criar/Editar)
 *
 * Ajustes de UX (clean):
 * - Título em 1 linha (truncate).
 * - Botões (Preview/Salvar/Publicar/...) vão para a barra abaixo do título.
 * - Badge "Publicado" em verde (franco) e "Ficha cadastral" em azul suave.
 * - Bloco "Conteúdo do contrato" com botões inline e agrupados:
 *   - Configurações (toggle ficha cadastral)
 *   - Adicionar (cláusula / texto livre)
 *
 * Observação:
 * - Mantemos o título exatamente como foi salvo pelo usuário.
 * - Ações destrutivas e "Transformar" ficam no menu (...) para reduzir ruído.
 */

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Eye,
  FileText,
  Save,
  Settings,
  FileSignature,
  MoreHorizontal,
  Trash2,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  type DocumentTemplate,
  type DocumentTemplateStatus,
  documentTemplateStatusLabel,
  documentTemplateTypeLabel,
} from "@/app/modules/contratos/document-templates/document-templates.schema";

import { BlocksArea } from "./blocks-area";
import { PreviewDialog } from "./preview-dialog";
import { ClauseDialog } from "./clause-dialog";
import { FreeTextDialog } from "./free-text-dialog";
import { EMPTY_RICH_TEXT, type RichTextJson } from "./rich-text-editor";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";

interface Props {
  mode: "create" | "edit";
  template: DocumentTemplate | null;

  isLoading: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;

  onChange: (nextContent: any) => void;

  onSaveDraft: () => Promise<void>;
  onPublish: () => Promise<void>;
  onDelete: () => Promise<void>;

  onToggleAddendum: (next: boolean) => Promise<void>;
  onToggleRegistration: (next: boolean) => Promise<void>;

  disableActions?: boolean;
}

/**
 * Badge variant padrão (shadcn) por status.
 * Observação: além do variant, vamos aplicar classes para deixar "Publicado" verde.
 */
function statusVariant(status: DocumentTemplateStatus) {
  if (status === "PUBLISHED") return "default";
  if (status === "ARCHIVED") return "secondary";
  return "outline";
}

/**
 * Classes extras para deixar badges mais bonitas (sem mudar o componente Badge).
 */
function statusBadgeClass(status: DocumentTemplateStatus) {
  if (status === "PUBLISHED") {
    // verde “franco”, sem gritar
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }
  if (status === "ARCHIVED") {
    return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
  // DRAFT
  return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

const REGISTRATION_BADGE_CLASS =
  "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50";

export function ContractEditorShell({
  mode,
  template,
  isLoading,
  isSaving,
  isDeleting,
  onChange,
  onSaveDraft,
  onPublish,
  onDelete,
  onToggleAddendum,
  onToggleRegistration,
  disableActions,
}: Props) {
  const [openPreview, setOpenPreview] = useState(false);

  // Modal de criação de cláusula
  const [openClauseDialog, setOpenClauseDialog] = useState(false);
  const [clauseTitleDraft, setClauseTitleDraft] = useState("");

  // Modal de criação de texto livre
  const [openFreeTextDialog, setOpenFreeTextDialog] = useState(false);
  const [freeTextDraft, setFreeTextDraft] = useState<RichTextJson>(EMPTY_RICH_TEXT);

  const actionsDisabled = Boolean(disableActions || isLoading);

  const title =
    template?.title ?? (mode === "create" ? "Novo contrato" : "Contrato");

  const status = template?.status ?? ("DRAFT" as DocumentTemplateStatus);
  const isAddendum = template?.isAddendum ?? false;
  const hasRegistration = template?.hasRegistration ?? true;

  const safeContent = template?.content ?? { version: 1, blocks: [] as any[] };

  const subtitle = useMemo(() => {
    const type = documentTemplateTypeLabel(isAddendum);
    return mode === "create"
      ? `Criando ${type.toLowerCase()}`
      : `Editando ${type.toLowerCase()}`;
  }, [isAddendum, mode]);

  const showLoadingState = !template && isLoading;

  /**
   * -------------------------
   * Cláusula (modal)
   * -------------------------
   */
  function handleOpenClauseDialog() {
    setClauseTitleDraft("");
    setOpenClauseDialog(true);
  }

  function handleCancelClauseDialog() {
    setClauseTitleDraft("");
    setOpenClauseDialog(false);
  }

  function handleSaveClauseDialog() {
    const rawTitle = clauseTitleDraft.trim();
    if (!rawTitle) return;

    const next = structuredClone(safeContent);
    next.blocks = next.blocks ?? [];

    const order =
      next.blocks.filter((b: any) => b.type === "clause").length + 1;

    next.blocks.push({
      type: "clause",
      id: crypto.randomUUID(),
      order,
      title: `CLÁUSULA ${order} – ${rawTitle}`,
      items: [],
    });

    onChange(next);
    setClauseTitleDraft("");
    setOpenClauseDialog(false);
  }

  /**
   * -------------------------
   * Texto livre (modal)
   * -------------------------
   */
  function handleOpenFreeTextDialog() {
    setFreeTextDraft(EMPTY_RICH_TEXT);
    setOpenFreeTextDialog(true);
  }

  function handleCancelFreeTextDialog() {
    setFreeTextDraft(EMPTY_RICH_TEXT);
    setOpenFreeTextDialog(false);
  }

  function handleSaveFreeTextDialog(value: RichTextJson) {
    const next = structuredClone(safeContent);
    next.blocks = next.blocks ?? [];

    next.blocks.push({
      type: "freeText",
      id: crypto.randomUUID(),
      richText: value,
    });

    onChange(next);
    setFreeTextDraft(EMPTY_RICH_TEXT);
    setOpenFreeTextDialog(false);
  }

  return (
    <div className="p-6">
     <AppBreadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Contratos", href: "/contratos" },
          { label: subtitle },
        ]}
      />


      <div className="mx-auto mt-6 max-w-6xl space-y-4">
        {/* Header (título em 1 linha) */}
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md border p-2 text-muted-foreground">
                  {isAddendum ? (
                    <FileSignature className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>

                {/* ✅ 1 linha + truncate */}
                <h1 className="min-w-0 truncate text-xl font-semibold leading-snug">
                  {title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={statusVariant(status)}
                  className={`h-6 px-2 text-xs ${statusBadgeClass(status)}`}
                >
                  {documentTemplateStatusLabel(status)}
                </Badge>

                {hasRegistration && (
                  <Badge
                    variant="outline"
                    className={`h-6 px-2 text-xs ${REGISTRATION_BADGE_CLASS}`}
                  >
                    Ficha cadastral
                  </Badge>
                )}

              </div>
            </div>
          </div>

          {/* ✅ Action bar abaixo do título */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenPreview(true)}
              disabled={actionsDisabled}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onSaveDraft}
              disabled={actionsDisabled || Boolean(isSaving)}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar rascunho
            </Button>

            <Button
              size="sm"
              onClick={onPublish}
              disabled={actionsDisabled || Boolean(isSaving)}
              className="gap-2"
            >
              <BadgeCheck className="h-4 w-4" />
              Publicar
            </Button>

            {/* Menu (...) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={actionsDisabled}
                  title="Mais ações"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => onToggleAddendum(!isAddendum)}
                  disabled={actionsDisabled || Boolean(isSaving)}
                >
                  <Settings className="h-4 w-4" />
                  {isAddendum
                    ? "Transformar em contrato"
                    : "Transformar em aditivo"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={onDelete}
                  disabled={actionsDisabled || Boolean(isDeleting)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Conteúdo */}
        {showLoadingState ? (
          <div className="rounded-lg border p-6 text-sm text-muted-foreground">
            Carregando contrato...
          </div>
        ) : (
          <>
            {/* Toolbar “Conteúdo do contrato” mais bonita e fácil de entender */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">Conteúdo do contrato</div>
                  <div className="text-xs text-muted-foreground">
                    Configure a ficha cadastral e adicione blocos ao documento.
                  </div>
                </div>

                {/* ✅ Tudo inline + agrupado */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Grupo: Configurações */}
                  <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Configuração
                    </span>

                    {/* aqui mantemos o seu componente, mas ele precisa renderizar inline */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2"
                      disabled={actionsDisabled || Boolean(isSaving)}
                      onClick={() => onToggleRegistration(!hasRegistration)}
                      title="Alternar ficha cadastral"
                    >
                      <Settings className="h-4 w-4" />
                      Ficha cadastral
                      <span
                        className={`ml-1 inline-flex h-2.5 w-2.5 rounded-full ${
                          hasRegistration ? "bg-emerald-500" : "bg-zinc-300"
                        }`}
                      />
                    </Button>
                  </div>

                  {/* Grupo: Adicionar */}
                  <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Adicionar
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-2"
                      disabled={actionsDisabled || Boolean(isSaving)}
                      onClick={handleOpenClauseDialog}
                    >
                      + Cláusula
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-2"
                      disabled={actionsDisabled || Boolean(isSaving)}
                      onClick={handleOpenFreeTextDialog}
                    >
                      Texto livre
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <BlocksArea
              disabled={actionsDisabled || Boolean(isSaving)}
              content={safeContent}
              onChange={onChange}
            />
          </>
        )}

        <PreviewDialog
          open={openPreview}
          onOpenChange={setOpenPreview}
          template={template}
        />

        <ClauseDialog
          open={openClauseDialog}
          title={clauseTitleDraft}
          onTitleChange={setClauseTitleDraft}
          onCancel={handleCancelClauseDialog}
          onSave={handleSaveClauseDialog}
        />

        <FreeTextDialog
          open={openFreeTextDialog}
          title="Texto livre"
          initialValue={freeTextDraft}
          onCancel={handleCancelFreeTextDialog}
          onSave={handleSaveFreeTextDialog}
          isSaving={Boolean(isSaving)}
        />
      </div>
    </div>
  );
}
