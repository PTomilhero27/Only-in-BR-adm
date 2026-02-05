"use client"

/**
 * Tab de Observações do expositor (OwnerFair.observations).
 * Responsabilidade:
 * - Exibir observações em modo somente leitura (readOnly)
 * - Permitir habilitar edição (toggle)
 * - Salvar via API (PATCH /fairs/:fairId/exhibitors/:ownerId/observations)
 *
 * Decisão:
 * - Para suportar negrito/listas sem mudar o schema agora,
 *   salvamos HTML do editor no campo `observations` (string).
 */

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Italic, List, ListOrdered, Pencil, Save, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"

import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { useUpdateFairExhibitorObservationsMutation } from "@/app/modules/fairs/exhibitors/exhibitors.queries"
import { getErrorMessage } from "@/app/shared/utils/get-error-message"

type Props = {
  fairId: string
  row: FairExhibitorRow | null
}

const TOGGLE_ACTIVE =
  "data-[state=on]:bg-orange-500 data-[state=on]:text-white data-[state=on]:hover:bg-orange-500/90"

/**
 * Garante um HTML válido pro editor.
 * - Se vier null/undefined/vazio, mostramos um parágrafo vazio.
 */
function normalizeHtml(html?: string | null) {
  const v = (html ?? "").trim()
  if (!v) return "<p></p>"
  return v
}

export function ExhibitorObservationsTab({ fairId, row }: Props) {
  const mutation = useUpdateFairExhibitorObservationsMutation(fairId)

  const [editing, setEditing] = React.useState(false)
  const [lastSavedHtml, setLastSavedHtml] = React.useState<string>(() =>
    normalizeHtml(row?.observations ?? null),
  )

  // Quando trocar o expositor (ou quando row virar null ao fechar modal)
  React.useEffect(() => {
    setEditing(false)
    setLastSavedHtml(normalizeHtml(row?.observations ?? null))
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.ownerFairId])

  /**
   * ✅ Sempre inicializa o editor (nada de null), para não dar erro de overload.
   * Quando row for null, usamos conteúdo vazio e deixamos readOnly.
   */
  const editor = useEditor({
    immediatelyRender: false,
    editable: !!row && editing,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: "list-disc pl-6 my-2" },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: "list-decimal pl-6 my-2" },
        },
        listItem: {
          HTMLAttributes: { class: "my-1" },
        },
      }),
    ],
    content: lastSavedHtml, // HTML inicial
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[220px] w-full rounded-md border bg-background px-3 py-3 text-sm",
          "leading-relaxed focus:outline-none",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p]:my-2",
        ),
      },
    },
  })

  /**
   * Mantém editor sincronizado quando lastSavedHtml mudar
   * (troca de row, salvar, fechar modal => row null).
   */
  React.useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== lastSavedHtml) {
      editor.commands.setContent(lastSavedHtml, { emitUpdate: false })
    }
  }, [editor, lastSavedHtml])

  /**
   * Alterna modo edição.
   * - Ao entrar em edição, foca no editor.
   */
  React.useEffect(() => {
    if (!editor) return

    const canEdit = !!row && editing
    editor.setEditable(canEdit)

    if (canEdit) {
      setTimeout(() => editor.chain().focus().run(), 0)
    }
  }, [editor, editing, row])

  const isSaving = mutation.isPending

  function handleEdit() {
    if (!row) return
    if (isSaving) return
    setEditing(true)
  }

  function handleCancel() {
    if (isSaving) return
    setEditing(false)
    if (editor) {
      editor.commands.setContent(lastSavedHtml, { emitUpdate: false })
    }
  }

  async function handleSave() {
    if (!row) return
    if (!editor || isSaving) return

    const html = normalizeHtml(editor.getHTML())

    try {
      await mutation.mutateAsync({
        ownerId: row.owner.id,
        input: { observations: html },
      })

      setLastSavedHtml(html)
      setEditing(false)

      toast.success({
        title: "Observações salvas",
        subtitle: "As observações do expositor foram atualizadas.",
      })
    } catch (err) {
      toast.error({
        title: "Erro ao salvar observações",
        subtitle: getErrorMessage(err),
      })
    }
  }

  return (
    <div className="space-y-3">
      {/* Barra de ações */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Use este campo para registrar observações internas sobre o expositor.
        </div>

        {!editing ? (
          <Button variant="outline" onClick={handleEdit} disabled={!row || isSaving}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>

            <Button onClick={handleSave} disabled={!row || isSaving}>
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  Salvando
                  <Spinner className="h-4 w-4" />
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Toolbar do editor (só quando editando e com row) */}
      {editing && row && editor && (
        <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/20 p-1">
          <Toggle
            size="sm"
            className={TOGGLE_ACTIVE}
            pressed={editor.isActive("bold")}
            onMouseDown={(e) => e.preventDefault()}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Negrito"
          >
            <Bold className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            className={TOGGLE_ACTIVE}
            pressed={editor.isActive("italic")}
            onMouseDown={(e) => e.preventDefault()}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Itálico"
          >
            <Italic className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-8" />

          <Toggle
            size="sm"
            className={TOGGLE_ACTIVE}
            pressed={editor.isActive("bulletList")}
            onMouseDown={(e) => e.preventDefault()}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Lista com marcadores"
          >
            <List className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            className={TOGGLE_ACTIVE}
            pressed={editor.isActive("orderedList")}
            onMouseDown={(e) => e.preventDefault()}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
        </div>
      )}

      {/* Editor */}
      <div className={cn(isSaving && "opacity-70 pointer-events-none")}>
        {editor ? <EditorContent editor={editor} /> : null}
      </div>
    </div>
  )
}
