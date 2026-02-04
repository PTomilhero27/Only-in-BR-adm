/**
 * rich-text-placeholders.ts
 *
 * Responsabilidade:
 * - Extrair placeholders do JSON do Tiptap ({{KEY}}).
 * - Validar se existem no catálogo de placeholders.
 *
 * Decisão:
 * - A validação aqui é "de catálogo" (sintaxe + key conhecida).
 * - A validação "de valor real" (ex.: EXHIBITOR_NAME preenchido) fica para a fase de render/geração do contrato.
 */

import { RichTextJson } from "@/app/(app)/contratos/components/rich-text-editor"
import { CONTRACT_PLACEHOLDERS } from "../hooks/contract-placeholders.catalog"

export type PlaceholderValidationItem = {
  raw: string // ex: "{{EXHIBITOR_NAME}}"
  key: string // ex: "EXHIBITOR_NAME"
  isValid: boolean
  label?: string
  group?: string
}

const PLACEHOLDER_REGEX = /\{\{([A-Z0-9_]+)\}\}/g

function walk(node: any, out: string[]) {
  if (!node) return

  // Tiptap guarda textos em nodes { type:"text", text:"..." }
  if (typeof node.text === "string") out.push(node.text)

  const content = node.content
  if (Array.isArray(content)) content.forEach((child) => walk(child, out))
}

/**
 * Extrai todos os placeholders encontrados no documento.
 * Retorna valores únicos (sem duplicar).
 */
export function extractPlaceholders(doc: RichTextJson | null | undefined) {
  const texts: string[] = []
  walk(doc, texts)

  const joined = texts.join("\n")
  const found = new Set<string>()

  let match: RegExpExecArray | null
  while ((match = PLACEHOLDER_REGEX.exec(joined))) {
    found.add(match[0]) // "{{KEY}}"
  }

  return Array.from(found)
}

/**
 * Valida placeholders pelo catálogo do projeto.
 */
export function validatePlaceholders(
  doc: RichTextJson | null | undefined,
): PlaceholderValidationItem[] {
  const items = extractPlaceholders(doc)

  return items.map((raw) => {
    const key = raw.replace("{{", "").replace("}}", "")
    const meta = CONTRACT_PLACEHOLDERS.find((p) => p.key === key)

    return {
      raw,
      key,
      isValid: Boolean(meta),
      label: meta?.label,
      group: meta?.group,
    }
  })
}

/**
 * Se o usuário apagar tudo, mantemos "/" para facilitar reabrir o menu.
 */
export function ensureSlashWhenEmpty(doc: RichTextJson): RichTextJson {
  const content: any[] = (doc as any)?.content ?? []
  const isEmpty =
    !Array.isArray(content) ||
    content.length === 0 ||
    (content.length === 1 &&
      content[0]?.type === "paragraph" &&
      (!Array.isArray(content[0]?.content) || content[0]?.content?.length === 0))

  if (!isEmpty) return doc

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "/" }],
      },
    ],
  }
}
