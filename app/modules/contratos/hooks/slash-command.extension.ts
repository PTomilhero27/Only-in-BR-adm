"use client"

/**
 * SlashCommandExtension
 *
 * Responsabilidade:
 * - Habilitar sugestões ao digitar "/" dentro do editor (Tiptap).
 * - Inserir placeholders no formato {{CHAVE}} como texto simples.
 *
 * Correção importante:
 * - Em algumas versões do @tiptap/suggestion, `props.command` NÃO existe em `onKeyDown`.
 * - Por isso guardamos o command numa closure no onStart/onUpdate e reutilizamos no onKeyDown.
 */

import { Extension } from "@tiptap/core"
import Suggestion from "@tiptap/suggestion"

import {
  CONTRACT_PLACEHOLDERS,
  type ContractPlaceholderItem,
} from "./contract-placeholders.catalog"
import { createSlashCommandRenderer } from "./slash-command.renderer"

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    const ui = createSlashCommandRenderer()

    return [
      Suggestion({
        editor: this.editor,

        char: "/",
        startOfLine: false,

        items: ({ query }: { query: string }) => {
          const q = query.trim().toLowerCase()
          const base = CONTRACT_PLACEHOLDERS

          if (!q) return base.slice(0, 30)

          return base
            .filter((it) => {
              return (
                it.label.toLowerCase().includes(q) ||
                it.key.toLowerCase().includes(q) ||
                (it.group ?? "").toLowerCase().includes(q)
              )
            })
            .slice(0, 30)
        },

        command: ({
          editor,
          range,
          props,
        }: {
          editor: any
          range: { from: number; to: number }
          props: ContractPlaceholderItem
        }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(`{{${props.key}}}`)
            .run()
        },

        render: () => {
          // ✅ guardamos itens e command em closure (porque onKeyDown pode não ter props.command)
          let currentItems: ContractPlaceholderItem[] = []
          let runCommand: ((item: ContractPlaceholderItem) => void) | null = null

          return {
            onStart: (props: any) => {
              currentItems = props.items ?? []
              runCommand = (item: ContractPlaceholderItem) => props.command(item)

              ui.setSelectedIndex(0)
              ui.render({
                items: currentItems,
                command: (item) => runCommand?.(item),
              })

              const rect = props.clientRect?.()
              if (rect) ui.setPosition(rect)
            },

            onUpdate: (props: any) => {
              currentItems = props.items ?? []
              runCommand = (item: ContractPlaceholderItem) => props.command(item)

              ui.render({
                items: currentItems,
                command: (item) => runCommand?.(item),
              })

              const rect = props.clientRect?.()
              if (rect) ui.setPosition(rect)
            },

            onKeyDown: (props: any) => {
              // ESC fecha
              if (props.event.key === "Escape") {
                ui.destroyRoot()
                return true
              }

              // Enter executa o item selecionado usando a closure runCommand
              const handled = ui.onKeyDown(props.event, currentItems, () => {
                const idx = ui.getSelectedIndex()
                const item = currentItems[idx]
                if (item) runCommand?.(item)
              })

              return handled
            },

            onExit: () => {
              ui.destroyRoot()
            },
          }
        },
      }),
    ]
  },
})
