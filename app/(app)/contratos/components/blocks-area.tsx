"use client";

/**
 * BlocksArea
 *
 * Responsabilidade:
 * - Renderizar e editar (local) os blocos do contrato:
 *   - clause: cláusula com itens (incisos)
 *   - freeText: texto livre (richText)
 *
 * Implementado:
 * - Texto livre:
 *   - Menu (...) com Editar (abre modal) e Excluir
 *   - Card mostra apenas viewer (preview)
 *
 * - Cláusula:
 *   - Menu (...) com: Editar (inteligente), Adicionar inciso, Excluir
 *   - Editar (inteligente):
 *     - sem incisos => abre ClauseDialog direto
 *     - com incisos => abre modal de escolha (Editar cláusula | Editar incisos)
 *   - Editar incisos usa IncisosDialog preenchido e renumera ao salvar
 *   - Adicionar inciso abre IncisosDialog começando em order.(len+1) e renumera tudo ao salvar
 */

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ClauseDialog } from "./clause-dialog";
import { EditClauseOrIncisosDialog } from "./edit-clause-or-incisos-dialog";
import { IncisosDialog, type IncisoDraft } from "./inciso-dialog";
import { FreeTextDialog } from "./free-text-dialog";
import { RichTextViewer } from "./rich-text-viewer";
import { EMPTY_RICH_TEXT, type RichTextJson } from "./rich-text-editor";

function ensureBase(content: any) {
  return content && typeof content === "object"
    ? content
    : { version: 1, blocks: [] };
}

function extractHumanClauseTitle(fullTitle: string) {
  const parts = fullTitle.split("–").map((s) => s.trim());
  if (parts.length >= 2) return parts.slice(1).join(" – ");
  return fullTitle.trim();
}

function buildClauseTitle(order: number, humanTitle: string) {
  return `CLÁUSULA ${order} – ${humanTitle.trim()}`;
}

function renumberIncisos(
  clauseOrder: number,
  items: Array<{ id: string; richText: any }>,
) {
  return items.map((it, idx) => ({
    id: it.id,
    number: `${clauseOrder}.${idx + 1}`,
    richText: it.richText,
  }));
}

export function BlocksArea(props: {
  disabled: boolean;
  content: any;
  onChange: (nextContent: any) => void;
}) {
  const { disabled, content, onChange } = props;

  const base = ensureBase(content);
  const blocks = base.blocks ?? [];

  const [editClauseTarget, setEditClauseTarget] = useState<{
    clauseId: string;
    titleDraft: string;
  } | null>(null);

  const [editChoiceTarget, setEditChoiceTarget] = useState<{
    clauseId: string;
  } | null>(null);

  const [editIncisosTarget, setEditIncisosTarget] = useState<{
    clauseId: string;
    clauseOrder: number;
    startNumber: string;
    initialItems: IncisoDraft[];
  } | null>(null);

  const [addIncisosTarget, setAddIncisosTarget] = useState<{
    clauseId: string;
    clauseOrder: number;
    startNumber: string;
  } | null>(null);

  // ✅ Texto livre: alvo do modal de edição
  const [editFreeTextTarget, setEditFreeTextTarget] = useState<{
    blockId: string;
    initialValue: RichTextJson;
  } | null>(null);

  function updateBlocks(nextBlocks: any[]) {
    onChange({ ...base, blocks: nextBlocks });
  }

  function removeBlock(idx: number) {
    const next = structuredClone(blocks);
    next.splice(idx, 1);
    updateBlocks(next);
  }

  function removeInciso(clauseId: string, incisoId: string) {
    const next = structuredClone(blocks);
    const clause = next.find(
      (b: any) => b.type === "clause" && b.id === clauseId,
    );
    if (!clause) return;

    clause.items = (clause.items ?? []).filter((it: any) => it.id !== incisoId);

    clause.items = renumberIncisos(
      clause.order,
      clause.items.map((it: any) => ({ id: it.id, richText: it.richText })),
    );

    updateBlocks(next);
  }

  function openEditClause(clause: any) {
    setEditClauseTarget({
      clauseId: clause.id,
      titleDraft: extractHumanClauseTitle(clause.title ?? ""),
    });
  }

  function saveEditClause() {
    if (!editClauseTarget) return;

    const humanTitle = editClauseTarget.titleDraft.trim();
    if (!humanTitle) return;

    const next = structuredClone(blocks);
    const clause = next.find(
      (b: any) => b.type === "clause" && b.id === editClauseTarget.clauseId,
    );
    if (!clause) return;

    clause.title = buildClauseTitle(clause.order, humanTitle);

    updateBlocks(next);
    setEditClauseTarget(null);
  }

  function handleEditAction(clause: any) {
    const items = clause.items ?? [];
    if (items.length === 0) {
      openEditClause(clause);
      return;
    }
    setEditChoiceTarget({ clauseId: clause.id });
  }

  function handleAddIncisosAction(clause: any) {
    const len = clause.items?.length ?? 0;
    const startNumber = `${clause.order}.${len + 1}`;

    setAddIncisosTarget({
      clauseId: clause.id,
      clauseOrder: clause.order,
      startNumber,
    });
  }

  const hasBlocks = (blocks?.length ?? 0) > 0;

  if (!hasBlocks) {
    return (
      <Card className="p-8">
        <div className="text-sm font-medium">Nenhum bloco ainda</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Use os botões acima para adicionar cláusulas e textos livres.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block: any, idx: number) => {
        /**
         * -------------------------
         * Texto livre (viewer + modal)
         * -------------------------
         */
        if (block.type === "freeText") {
          return (
            <Card key={block.id ?? idx} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Texto livre</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Texto livre (edite pelo menu)
                  </div>
                </div>

                {/* Menu ... */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      title="Ações do texto"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      className="gap-2"
                      disabled={disabled}
                      onClick={() =>
                        setEditFreeTextTarget({
                          blockId: block.id,
                          initialValue: block.richText ?? EMPTY_RICH_TEXT,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                      Editar texto
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      disabled={disabled}
                      onClick={() => removeBlock(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir texto
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="rounded-md border p-3">
                <RichTextViewer value={block.richText} />
              </div>
            </Card>
          );
        }

        /**
         * -------------------------
         * Cláusula
         * -------------------------
         */
        if (block.type === "clause") {
          const items = block.items ?? [];

          return (
            <Card key={block.id ?? idx} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Cláusula</Badge>
                    <div className="text-sm font-medium">{block.title}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Incisos: {items.length}
                  </div>
                </div>

                {/* Menu ... */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      title="Ações da cláusula"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      className="gap-2"
                      disabled={disabled}
                      onClick={() => handleEditAction(block)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="gap-2"
                      disabled={disabled}
                      onClick={() => handleAddIncisosAction(block)}
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar inciso
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      disabled={disabled}
                      onClick={() => removeBlock(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir cláusula
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Incisos */}
              <div className="space-y-3">
                {items.map((it: any) => (
                  <div key={it.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium">{it.number}</div>

                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={disabled}
                          onClick={() => removeInciso(block.id, it.id)}
                          title="Remover inciso"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>

                    <div className="mt-2">
                      <RichTextViewer value={it.richText} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        }

        return (
          <Card key={block.id ?? idx} className="p-4">
            <div className="text-sm font-medium">Bloco desconhecido</div>
            <div className="text-xs text-muted-foreground">
              type: {String(block.type)}
            </div>
          </Card>
        );
      })}

      {/* ✅ Modal editar Texto Livre */}
      {editFreeTextTarget && (
        <FreeTextDialog
          open
          title="Editar texto livre"
          initialValue={editFreeTextTarget.initialValue}
          onCancel={() => setEditFreeTextTarget(null)}
          onSave={(json) => {
            const next = structuredClone(blocks);
            const target = next.find(
              (b: any) =>
                b.type === "freeText" && b.id === editFreeTextTarget.blockId,
            );
            if (!target) return;

            target.richText = json;

            updateBlocks(next);
            setEditFreeTextTarget(null);
          }}
        />
      )}

      {/* ✅ Modal de escolha (se há incisos) */}
      {editChoiceTarget &&
        (() => {
          const clause = blocks.find(
            (b: any) => b.type === "clause" && b.id === editChoiceTarget.clauseId,
          );
          if (!clause) return null;

          const items = clause.items ?? [];

          return (
            <EditClauseOrIncisosDialog
              open
              onOpenChange={(v) => {
                if (!v) setEditChoiceTarget(null);
              }}
              onEditClause={() => {
                setEditChoiceTarget(null);
                openEditClause(clause);
              }}
              onEditIncisos={() => {
                const startNumber = `${clause.order}.1`;

                setEditIncisosTarget({
                  clauseId: clause.id,
                  clauseOrder: clause.order,
                  startNumber,
                  initialItems: items.map((it: any) => ({
                    id: it.id,
                    number: it.number,
                    richText: it.richText,
                  })),
                });

                setEditChoiceTarget(null);
              }}
            />
          );
        })()}

      {/* ✅ Modal de edição de incisos (preenchido) */}
      {editIncisosTarget && (
        <IncisosDialog
          open
          startNumber={editIncisosTarget.startNumber}
          initialItems={editIncisosTarget.initialItems}
          onCancel={() => setEditIncisosTarget(null)}
          onSave={(nextItems) => {
            const next = structuredClone(blocks);
            const clause = next.find(
              (b: any) => b.type === "clause" && b.id === editIncisosTarget.clauseId,
            );
            if (!clause) return;

            clause.items = renumberIncisos(
              editIncisosTarget.clauseOrder,
              nextItems.map((it) => ({ id: it.id, richText: it.richText })),
            );

            updateBlocks(next);
            setEditIncisosTarget(null);
          }}
        />
      )}

      {/* ✅ Modal para ADICIONAR novos incisos */}
      {addIncisosTarget && (
        <IncisosDialog
          open
          startNumber={addIncisosTarget.startNumber}
          onCancel={() => setAddIncisosTarget(null)}
          onSave={(newItems) => {
            const next = structuredClone(blocks);
            const clause = next.find(
              (b: any) => b.type === "clause" && b.id === addIncisosTarget.clauseId,
            );
            if (!clause) return;

            const existing = clause.items ?? [];

            const combined = [
              ...existing.map((it: any) => ({ id: it.id, richText: it.richText })),
              ...newItems.map((it) => ({ id: it.id, richText: it.richText })),
            ];

            clause.items = renumberIncisos(addIncisosTarget.clauseOrder, combined);

            updateBlocks(next);
            setAddIncisosTarget(null);
          }}
        />
      )}

      {/* ✅ Modal editar cláusula */}
      {editClauseTarget && (
        <ClauseDialog
          open
          title={editClauseTarget.titleDraft}
          onTitleChange={(v) =>
            setEditClauseTarget((prev) =>
              prev ? { ...prev, titleDraft: v } : prev,
            )
          }
          onCancel={() => setEditClauseTarget(null)}
          onSave={saveEditClause}
        />
      )}
    </div>
  );
}
