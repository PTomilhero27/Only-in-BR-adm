"use client"

/**
 * Slash Command Renderer
 *
 * Responsabilidade:
 * - Renderizar um popover com lista de sugestões ao digitar "/".
 * - Permitir navegação por teclado, clique e scroll.
 *
 * Correções importantes:
 * - Garantimos pointer-events no popover (evita o ProseMirror "engolir" eventos).
 * - No item usamos pointerdown + preventDefault + stopPropagation:
 *   - mantém foco no editor
 *   - não deixa o clique fechar antes do comando executar
 * - No wheel fazemos stopPropagation para o scroll funcionar dentro da lista.
 */

import { cn } from "@/lib/utils"
import type { ContractPlaceholderItem } from "./contract-placeholders.catalog"

type RenderArgs = {
  items: ContractPlaceholderItem[]
  command: (item: ContractPlaceholderItem) => void
}

export function createSlashCommandRenderer() {
  let root: HTMLDivElement | null = null
  let listEl: HTMLDivElement | null = null

  let selectedIndex = 0
  let lastCommand: ((item: ContractPlaceholderItem) => void) | null = null

  function ensureRoot() {
    if (root) return

    root = document.createElement("div")
    root.className = cn(
      "fixed z-[9999]",
      "w-[340px] rounded-lg border bg-popover shadow-lg",
      "overflow-hidden",
    )

    // ✅ força aceitar eventos do mouse (evita “travamento” por captura do editor)
    root.style.pointerEvents = "auto"

    // ✅ impede eventos de mouse/scroll de borbulhar pro ProseMirror
    root.addEventListener("mousedown", (e) => e.stopPropagation())
    root.addEventListener("pointerdown", (e) => e.stopPropagation())
    root.addEventListener(
      "wheel",
      (e) => {
        e.stopPropagation()
      },
      { passive: true },
    )

    const header = document.createElement("div")
    header.className = "px-3 py-2 text-xs text-muted-foreground border-b"
    header.innerText = 'Sugestões ("/") — Enter para inserir, Esc para fechar'
    root.appendChild(header)

    listEl = document.createElement("div")
    listEl.className = cn(
      "max-h-[260px] overflow-auto p-1",
      "overscroll-contain",
    )
    listEl.style.pointerEvents = "auto"
    root.appendChild(listEl)

    document.body.appendChild(root)
  }

  function destroyRoot() {
    if (root?.parentNode) root.parentNode.removeChild(root)
    root = null
    listEl = null
    lastCommand = null
    selectedIndex = 0
  }

  function setPosition(rect: DOMRect) {
    ensureRoot()
    if (!root) return

    const padding = 8
    const x = rect.left
    const y = rect.bottom + padding

    // mantém na viewport (mínimo)
    root.style.left = `${Math.max(8, x)}px`
    root.style.top = `${Math.max(8, y)}px`
  }

  function setSelectedIndex(next: number) {
    selectedIndex = Math.max(0, next)
  }

  function getSelectedIndex() {
    return selectedIndex
  }

  function render({ items, command }: RenderArgs) {
    ensureRoot()
    if (!listEl) return

    lastCommand = command

    if (selectedIndex >= items.length) {
      selectedIndex = Math.max(0, items.length - 1)
    }

    listEl.innerHTML = ""

    if (!items.length) {
      const empty = document.createElement("div")
      empty.className = "px-3 py-2 text-sm text-muted-foreground"
      empty.innerText = "Nenhuma sugestão"
      listEl.appendChild(empty)
      return
    }

    items.forEach((it, idx) => {
      const row = document.createElement("button")
      row.type = "button"
      row.className = cn(
        "w-full text-left rounded-md px-3 py-2 text-sm",
        "hover:bg-muted/50",
        idx === selectedIndex ? "bg-muted" : "",
      )

      // ✅ clique confiável: dispara ANTES do blur/close
      row.addEventListener("pointerdown", (e) => {
        e.preventDefault()
        e.stopPropagation()
        lastCommand?.(it)
      })

      const label = document.createElement("div")
      label.className = "font-medium"
      label.innerText = it.label

      const meta = document.createElement("div")
      meta.className = "text-xs text-muted-foreground"
      meta.innerText = `${it.group ?? "Geral"} • {{${it.key}}}`

      row.appendChild(label)
      row.appendChild(meta)

      listEl?.appendChild(row)
    })

    // mantém o selecionado visível
    const selectedBtn = listEl.querySelectorAll("button")[selectedIndex] as
      | HTMLButtonElement
      | undefined
    selectedBtn?.scrollIntoView({ block: "nearest" })
  }

  function onKeyDown(
    event: KeyboardEvent,
    items: ContractPlaceholderItem[],
    onEnter: () => void,
  ) {
    if (!items.length) return false

    if (event.key === "ArrowDown") {
      event.preventDefault()
      selectedIndex = Math.min(items.length - 1, selectedIndex + 1)
      render({ items, command: lastCommand ?? (() => {}) })
      return true
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      selectedIndex = Math.max(0, selectedIndex - 1)
      render({ items, command: lastCommand ?? (() => {}) })
      return true
    }

    if (event.key === "Enter") {
      event.preventDefault()
      onEnter()
      return true
    }

    return false
  }

  return {
    render,
    destroyRoot,
    setPosition,
    setSelectedIndex,
    getSelectedIndex,
    onKeyDown,
  }
}
