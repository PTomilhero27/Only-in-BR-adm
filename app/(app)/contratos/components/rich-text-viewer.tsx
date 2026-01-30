"use client";

/**
 * Viewer somente leitura (Tiptap)
 *
 * Importante no Next:
 * - Setar `immediatelyRender: false` evita warning/erro SSR detectado.
 */

import * as React from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";

type RichTextViewerProps = {
  value: JSONContent | null;
  className?: string;
};

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function RichTextViewer({ value, className }: RichTextViewerProps) {
  const editor = useEditor({
    // ✅ FIX pro Next
    immediatelyRender: false,

    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
      }),
    ],
    content: value ?? EMPTY_DOC,
    editable: false,
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(value ?? EMPTY_DOC, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
