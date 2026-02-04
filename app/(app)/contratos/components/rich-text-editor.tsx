"use client"

/**
 * RichTextEditor (Tiptap) — Admin UX
 *
 * Responsabilidade:
 * - Centralizar a configuração do Tiptap para o módulo de contratos.
 * - Fornecer um JSON estável para salvar no banco (ProseMirror/Tiptap JSON).
 * - Permitir "slash commands" ("/") para inserir placeholders de contrato.
 *
 * Importante no Next:
 * - immediatelyRender: false (evita erro SSR/hidratação)
 *
 * Observação importante (bug “1 a +”):
 * - NÃO reutilize o mesmo objeto JSON como “vazio”.
 * - Tiptap/ProseMirror pode mutar o conteúdo e, se a referência for compartilhada,
 *   um novo editor pode “herdar” listas/marcações.
 * - Por isso, exportamos `createEmptyRichText()` (factory) e evitamos referência única.
 */

import * as React from "react"
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { Bold, Italic, List, ListOrdered } from "lucide-react"

import { cn } from "@/lib/utils"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"

// ✅ Extensão de slash command ("/")
import { SlashCommandExtension } from "@/app/modules/contratos/hooks/slash-command.extension"

export type RichTextJson = JSONContent

/**
 * Factory: sempre retorna um JSON novo.
 * Isso evita “vazamento” de estado entre instâncias do editor.
 */
export function createEmptyRichText(): RichTextJson {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  }
}

/**
 * Mantido por compatibilidade com código legado,
 * mas evite usar diretamente (prefira createEmptyRichText()).
 */
export const EMPTY_RICH_TEXT: RichTextJson = createEmptyRichText()

export function isRichTextEmpty(doc: RichTextJson | null | undefined) {
  if (!doc) return true
  const content: any[] = (doc as any).content ?? []
  if (!Array.isArray(content) || content.length === 0) return true

  if (content.length === 1 && content[0]?.type === "paragraph") {
    const pContent = content[0]?.content ?? []
    return !Array.isArray(pContent) || pContent.length === 0
  }

  return false
}

type Props = {
  value: RichTextJson
  onChange: (next: RichTextJson) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
}

const TOGGLE_ACTIVE =
  "data-[state=on]:bg-orange-500 data-[state=on]:text-white data-[state=on]:hover:bg-orange-500/90"

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite o texto...",
  readOnly = false,
  className,
}: Props) {
  const editor = useEditor({
    /**
     * Evita problemas de SSR/hidratação no Next App Router
     */
    immediatelyRender: false,

    /**
     * Extensions:
     * - StarterKit: base do editor (bold/italic/lists etc.)
     * - SlashCommandExtension: habilita "/" para inserir placeholders
     */
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,

        // Aplica classe no HTML gerado para listas (sem depender de CSS global)
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

      /**
       * ✅ Slash Commands:
       * - Quando o usuário digita "/" o Suggestion abre o menu.
       * - Ao escolher, inserimos um placeholder (ex.: {{EXPOSITOR_NOME}}).
       */
      SlashCommandExtension,
    ],

    /**
     * Conteúdo inicial
     * ✅ sempre garantimos um JSON válido, preferindo value.
     * Se vier null/undefined, criamos um vazio novo.
     */
    content: value ?? createEmptyRichText(),

    /**
     * Modo leitura
     */
    editable: !readOnly,

    /**
     * Atributos e classes do editor
     */
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[180px] w-full rounded-md border bg-background px-3 py-3 text-sm",
          "leading-relaxed focus:outline-none",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p]:my-2",
          "[&_.ProseMirror.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.ProseMirror.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror.is-editor-empty:first-child::before]:h-0",
          className,
        ),
        "data-placeholder": placeholder,
      },
    },

    /**
     * Sempre que muda, devolvemos o JSON (salvo no backend).
     */
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  /**
   * Mantém o editor sincronizado quando o value vem de fora (ex.: abrir modal, reset, etc.)
   * ✅ quando `value` vier vazio, criamos um JSON novo para evitar referência compartilhada.
   */
  React.useEffect(() => {
    if (!editor) return

    const next = value ?? createEmptyRichText()
    const current = editor.getJSON()

    if (JSON.stringify(current) !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div className="space-y-2">
      {!readOnly && (
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

      <EditorContent editor={editor} />
    </div>
  )
}
