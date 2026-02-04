"use client"

/**
 * BlocksArea
 *
 * Responsabilidade:
 * - Renderizar a área principal de blocos do template:
 *   - Texto livre
 *   - Cláusulas
 * - Abrir dialogs de edição/criação (cláusula, incisos, texto livre)
 * - Garantir consistência da estrutura (base.blocks)
 *
 * Importante:
 * - O número "humano" da cláusula (CLÁUSULA 1, 2, 3...) não pode depender do índice do array,
 *   porque existem blocos freeText entre as cláusulas.
 * - Por isso, calculamos `humanClauseOrder` contando apenas blocos do tipo "clause".
 */

import { useMemo, useState } from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { ClauseDialog } from "./clause-dialog"
import { EditClauseOrIncisosDialog } from "./edit-clause-or-incisos-dialog"
import { IncisosDialog, type IncisoDraft } from "./inciso-dialog"
import { FreeTextDialog } from "./free-text-dialog"
import { RichTextViewer } from "./rich-text-viewer"

import { createEmptyRichText, type RichTextJson } from "./rich-text-editor"

import { validatePlaceholders } from "@/app/modules/contratos/hooks/rich-text-placeholders"

function ensureBase(content: any) {
  return content && typeof content === "object" ? content : { version: 1, blocks: [] }
}

function extractHumanClauseTitle(fullTitle: string) {
  const parts = fullTitle.split("–").map((s) => s.trim())
  if (parts.length >= 2) return parts.slice(1).join(" – ")
  return fullTitle.trim()
}

function buildClauseTitle(order: number, humanTitle: string) {
  return `CLÁUSULA ${order} – ${humanTitle.trim()}`
}

/**
 * Renumera incisos sempre com base na ordem humana da cláusula.
 */
function renumberIncisos(
  humanClauseOrder: number,
  items: Array<{ id: string; richText: any }>,
) {
  return items.map((it, idx) => ({
    id: it.id,
    number: `${humanClauseOrder}.${idx + 1}`,
    richText: it.richText,
  }))
}

function PlaceholderBadges({ value }: { value: RichTextJson | undefined }) {
  const items = useMemo(() => validatePlaceholders(value), [value])
  if (!items.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((v) => (
        <Badge
          key={v.raw}
          variant="outline"
          className={
            v.isValid
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }
          title={
            v.isValid
              ? `OK: ${v.label ?? v.key}`
              : "Placeholder inválido (não existe no catálogo)"
          }
        >
          {v.raw}
        </Badge>
      ))}
    </div>
  )
}

export function BlocksArea(props: {
  disabled: boolean
  content: any
  onChange: (nextContent: any) => void
}) {
  const { disabled, content, onChange } = props

  const base = ensureBase(content)
  const blocks = base.blocks ?? []

  const [editClauseTarget, setEditClauseTarget] = useState<{
    clauseId: string
    titleDraft: string
  } | null>(null)

  const [editChoiceTarget, setEditChoiceTarget] = useState<{
    clauseId: string
  } | null>(null)

  const [editIncisosTarget, setEditIncisosTarget] = useState<{
    clauseId: string
    humanClauseOrder: number
    startNumber: string
    initialItems: IncisoDraft[]
  } | null>(null)

  const [addIncisosTarget, setAddIncisosTarget] = useState<{
    clauseId: string
    humanClauseOrder: number
    startNumber: string
  } | null>(null)

  const [editFreeTextTarget, setEditFreeTextTarget] = useState<{
    blockId: string
    initialValue: RichTextJson
  } | null>(null)

  function updateBlocks(nextBlocks: any[]) {
    onChange({ ...base, blocks: nextBlocks })
  }

  function removeBlock(idx: number) {
    const next = structuredClone(blocks)
    next.splice(idx, 1)
    updateBlocks(next)
  }

  /**
   * Retorna o número "humano" da cláusula, ignorando freeText.
   * Ex.: se houver freeText no meio, ainda assim as cláusulas serão 1,2,3...
   */
  function getHumanClauseOrder(clauseId: string): number {
    const clausesOnly = blocks.filter((b: any) => b.type === "clause")
    const index = clausesOnly.findIndex((c: any) => c.id === clauseId)
    return index >= 0 ? index + 1 : 1
  }

  function openEditClause(clause: any) {
    setEditClauseTarget({
      clauseId: clause.id,
      titleDraft: extractHumanClauseTitle(clause.title ?? ""),
    })
  }

  function saveEditClause() {
    if (!editClauseTarget) return
    const humanTitle = editClauseTarget.titleDraft.trim()
    if (!humanTitle) return

    const next = structuredClone(blocks)
    const clause = next.find(
      (b: any) => b.type === "clause" && b.id === editClauseTarget.clauseId,
    )
    if (!clause) return

    // ✅ título usa a ordem humana recalculada (não depende do idx do array)
    const humanOrder = getHumanClauseOrder(clause.id)
    clause.title = buildClauseTitle(humanOrder, humanTitle)

    updateBlocks(next)
    setEditClauseTarget(null)
  }

  function handleEditAction(clause: any) {
    const items = clause.items ?? []
    if (items.length === 0) {
      openEditClause(clause)
      return
    }
    setEditChoiceTarget({ clauseId: clause.id })
  }

  /**
   * ✅ Adicionar inciso:
   * - startNumber deve usar a ordem humana da cláusula, não o block.order nem idx.
   */
  function handleAddIncisosAction(clause: any) {
    const humanClauseOrder = getHumanClauseOrder(clause.id)
    const len = clause.items?.length ?? 0
    const startNumber = `${humanClauseOrder}.${len + 1}`

    setAddIncisosTarget({
      clauseId: clause.id,
      humanClauseOrder,
      startNumber,
    })
  }

  const hasBlocks = (blocks?.length ?? 0) > 0

  if (!hasBlocks) {
    return (
      <Card className="p-8">
        <div className="text-sm font-medium">Nenhum bloco ainda</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Use os botões acima para adicionar cláusulas e textos livres.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {blocks.map((block: any, idx: number) => {
        /**
         * -------------------------
         * Texto livre
         * -------------------------
         */
        if (block.type === "freeText") {
          return (
            <Card key={block.id ?? idx} className="gap-0 p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Texto livre
                  </div>

                  <PlaceholderBadges value={block.richText} />
                </div>

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
                      onClick={() => {
                        const initial = block.richText
                          ? structuredClone(block.richText)
                          : createEmptyRichText()

                        setEditFreeTextTarget({
                          blockId: block.id,
                          initialValue: initial,
                        })
                      }}
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

              <RichTextViewer value={block.richText} />
            </Card>
          )
        }

        /**
         * -------------------------
         * Cláusula
         * -------------------------
         */
        if (block.type === "clause") {
          const items = block.items ?? []

          return (
            <Card key={block.id ?? idx} className="gap-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-extrabold tracking-tight text-zinc-900">
                      {block.title}
                    </div>
                  </div>
                </div>

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
                  <div key={it.id} className="flex items-baseline gap-3 flex-row">
                    <div className="text-sm font-medium pt-1">{it.number}</div>
                    <RichTextViewer value={it.richText} />
                  </div>
                ))}
              </div>
            </Card>
          )
        }

        return (
          <Card key={block.id ?? idx} className="p-4">
            <div className="text-sm font-medium">Bloco desconhecido</div>
            <div className="text-xs text-muted-foreground">type: {String(block.type)}</div>
          </Card>
        )
      })}

      {/* Modal editar Texto Livre */}
      {editFreeTextTarget && (
        <FreeTextDialog
          open
          title="Editar texto livre"
          initialValue={editFreeTextTarget.initialValue}
          onCancel={() => setEditFreeTextTarget(null)}
          onSave={(json) => {
            const next = structuredClone(blocks)
            const target = next.find(
              (b: any) => b.type === "freeText" && b.id === editFreeTextTarget.blockId,
            )
            if (!target) return

            target.richText = json
            updateBlocks(next)
            setEditFreeTextTarget(null)
          }}
        />
      )}

      {/* ✅ Modal de escolha (editar cláusula vs editar incisos) */}
      {editChoiceTarget &&
        (() => {
          const clause = blocks.find(
            (b: any) => b.type === "clause" && b.id === editChoiceTarget.clauseId,
          )
          if (!clause) return null

          const items = clause.items ?? []

          return (
            <EditClauseOrIncisosDialog
              open
              onOpenChange={(v) => {
                if (!v) setEditChoiceTarget(null)
              }}
              onEditClause={() => {
                setEditChoiceTarget(null)
                openEditClause(clause)
              }}
              onEditIncisos={() => {
                // ✅ ordem humana correta, ignorando freeText
                const humanClauseOrder = getHumanClauseOrder(clause.id)
                const startNumber = `${humanClauseOrder}.1`

                setEditIncisosTarget({
                  clauseId: clause.id,
                  humanClauseOrder,
                  startNumber,
                  initialItems: items.map((it: any) => ({
                    id: it.id,
                    number: it.number,
                    richText: it.richText,
                  })),
                })

                setEditChoiceTarget(null)
              }}
            />
          )
        })()}

      {/* ✅ Modal edição de incisos */}
      {editIncisosTarget && (
        <IncisosDialog
          open
          startNumber={editIncisosTarget.startNumber}
          initialItems={editIncisosTarget.initialItems}
          onCancel={() => setEditIncisosTarget(null)}
          onSave={(nextItems) => {
            const next = structuredClone(blocks)
            const clause = next.find(
              (b: any) => b.type === "clause" && b.id === editIncisosTarget.clauseId,
            )
            if (!clause) return

            // ✅ renumera usando a ordem humana
            clause.items = renumberIncisos(
              editIncisosTarget.humanClauseOrder,
              nextItems.map((it) => ({ id: it.id, richText: it.richText })),
            )

            updateBlocks(next)
            setEditIncisosTarget(null)
          }}
        />
      )}

      {/* ✅ Modal adicionar incisos */}
      {addIncisosTarget && (
        <IncisosDialog
          open
          startNumber={addIncisosTarget.startNumber}
          onCancel={() => setAddIncisosTarget(null)}
          onSave={(newItems) => {
            const next = structuredClone(blocks)
            const clause = next.find(
              (b: any) => b.type === "clause" && b.id === addIncisosTarget.clauseId,
            )
            if (!clause) return

            const existing = clause.items ?? []

            const combined = [
              ...existing.map((it: any) => ({ id: it.id, richText: it.richText })),
              ...newItems.map((it) => ({ id: it.id, richText: it.richText })),
            ]

            // ✅ renumera usando a ordem humana correta
            clause.items = renumberIncisos(addIncisosTarget.humanClauseOrder, combined)

            updateBlocks(next)
            setAddIncisosTarget(null)
          }}
        />
      )}

      {/* Modal editar cláusula */}
      {editClauseTarget && (
        <ClauseDialog
          open
          title={editClauseTarget.titleDraft}
          onTitleChange={(v) =>
            setEditClauseTarget((prev) => (prev ? { ...prev, titleDraft: v } : prev))
          }
          onCancel={() => setEditClauseTarget(null)}
          onSave={saveEditClause}
        />
      )}
    </div>
  )
}
