"use client"

/**
 * Modal de busca rápida (Command Palette) para Interessados.
 *
 * Regras:
 * - Digitar → atualiza o filtro em tempo real
 * - Apagar tudo → limpa o filtro e volta ao estado normal
 * - ESC → limpa o filtro e fecha o modal
 * - Fechar pelo X / clique fora → mantém o filtro aplicado
 */

import { useEffect, useRef, useState } from "react"
import { CommandDialog, CommandInput, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

type Props = {
  value: string | undefined
  onChangeValue: (next: string | undefined) => void
}

export function InterestedSearchPalette({ value, onChangeValue }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value ?? "")

  const previousValueRef = useRef<string | undefined>(value)

  // Mantém draft alinhado com o filtro, quando o modal estiver fechado
  useEffect(() => {
    if (!open) setDraft(value ?? "")
  }, [value, open])

  function applyDraft(nextDraft: string) {
    setDraft(nextDraft)
    const normalized = nextDraft.trim()
    onChangeValue(normalized ? normalized : undefined)
  }

  function clearAndClose() {
    setDraft("")
    onChangeValue(undefined)
    setOpen(false)
  }

  // Atalho "/" para abrir
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        (target as any)?.isContentEditable

      if (isTyping) return

      if (e.key === "/") {
        e.preventDefault()
        previousValueRef.current = value
        setDraft(value ?? "")
        setOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [value])

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Pressione{" "}
          <kbd className="rounded border bg-muted/30 px-1.5 py-0.5">/</kbd>{" "}
          para buscar
        </span>

        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            previousValueRef.current = value
            setDraft(value ?? "")
            setOpen(true)
          }}
        >
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* ✅ ESC tratado aqui (sem erro de TS) */}
        <div
          onKeyDownCapture={(e) => {
            if (e.key !== "Escape") return
            e.preventDefault()
            e.stopPropagation()
            clearAndClose()
          }}
        >
          {/* Header clean */}
          <div className="border-b px-6 pt-5 pb-4">
            <div className="text-sm font-semibold">Buscar interessados</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Digite nome, documento ou e-mail
            </div>
          </div>

          <CommandInput
            value={draft}
            onValueChange={(v) => applyDraft(v)}
            placeholder="Digite nome, documento ou e-mail..."
            autoFocus
          />

          {/* Conteúdo minimalista (sem “card grande”) */}
          <CommandList>
            <div className="px-6 pb-3 pt-2">

              <div className=" text-xs text-muted-foreground">
                Pressione{" "}
                <kbd className="rounded border bg-muted/30 px-1.5 py-0.5">ESC</kbd>{" "}
                para limpar e voltar.
              </div>
            </div>
          </CommandList>
        </div>
      </CommandDialog>
    </>
  )
}
