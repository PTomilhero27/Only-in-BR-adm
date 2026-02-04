"use client"

/**
 * Viewer somente leitura (Tiptap)
 *
 * Responsabilidade:
 * - Renderizar o JSON do Tiptap em modo leitura (somente visualização).
 * - Garantir consistência visual para listas (ul/ol/li), parágrafos e espaçamentos.
 *
 * Importante no Next:
 * - Setar `immediatelyRender: false` evita warning/erro SSR/hidratação.
 *
 * Observação:
 * - Mesmo usando `prose`, precisamos forçar estilos de lista porque resets/typography
 *   podem remover marcadores e padding, fazendo a lista “sumir”.
 */

import * as React from "react"
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { cn } from "@/lib/utils"

type RichTextViewerProps = {
  value: JSONContent | null
  className?: string
}

/**
 * Factory para evitar referência compartilhada.
 * (Mesmo no viewer, é uma boa prática para manter consistência.)
 */
function createEmptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] }
}

export function RichTextViewer({ value, className }: RichTextViewerProps) {
  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,

        /**
         * ✅ Garantimos que o HTML gerado para listas tenha classes.
         * Isso ajuda muito quando o viewer está dentro de containers com resets.
         */
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

    content: value ?? createEmptyDoc(),
    editable: false,
  })

  /**
   * Mantém o viewer sincronizado quando `value` muda (ex.: salvar incisos e fechar modal).
   * Evita setContent redundante comparando JSON atual.
   */
  React.useEffect(() => {
    if (!editor) return

    const next = value ?? createEmptyDoc()
    const current = editor.getJSON()

    if (JSON.stringify(current) !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div
      className={cn(
        /**
         * ✅ Mantemos o "prose" porque ele dá uma leitura boa no contrato,
         * mas adicionamos regras explícitas para listas para evitar o bug
         * de “lista não aparece”.
         */
        "prose prose-sm max-w-none text-zinc-700",

        // 🔥 Força listas mesmo se o prose/reset “matar” marcadores
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2",
        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
        "[&_li]:my-1",
        "[&_p]:my-2",

        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
}
