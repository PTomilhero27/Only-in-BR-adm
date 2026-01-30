"use client";

/**
 * RichTextEditor (Tiptap) — Admin UX
 *
 * Exporta um contrato estável para o resto do módulo:
 * - EMPTY_RICH_TEXT
 * - isRichTextEmpty
 * - type RichTextJson
 *
 * Importante no Next:
 * - immediatelyRender: false (evita erro SSR/hidratação)
 */

import * as React from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Bold, Italic, List, ListOrdered } from "lucide-react";

import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";

export type RichTextJson = JSONContent;

export const EMPTY_RICH_TEXT: RichTextJson = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function isRichTextEmpty(doc: RichTextJson | null | undefined) {
  if (!doc) return true;
  const content: any[] = (doc as any).content ?? [];
  if (!Array.isArray(content) || content.length === 0) return true;

  if (content.length === 1 && content[0]?.type === "paragraph") {
    const pContent = content[0]?.content ?? [];
    return !Array.isArray(pContent) || pContent.length === 0;
  }
  return false;
}

type Props = {
  value: RichTextJson;
  onChange: (next: RichTextJson) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

const TOGGLE_ACTIVE =
  "data-[state=on]:bg-orange-500 data-[state=on]:text-white data-[state=on]:hover:bg-orange-500/90";

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite o texto...",
  readOnly = false,
  className,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,

        // ✅ Fix definitivo: aplica classe no HTML gerado (não depende de CSS global)
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

    content: value ?? EMPTY_RICH_TEXT,
    editable: !readOnly,

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

    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  React.useEffect(() => {
    if (!editor) return;

    const next = value ?? EMPTY_RICH_TEXT;
    const current = editor.getJSON();

    if (JSON.stringify(current) !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

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
  );
}
