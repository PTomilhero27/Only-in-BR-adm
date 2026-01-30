"use client"

import { useMemo, useState } from "react"
import { Search, CalendarDays, Check } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query"
import { FairStatus, type Fair } from "@/app/modules/fairs/types"

/**
 * Modal responsável por selecionar uma feira ATIVA.
 *
 * Responsabilidade única:
 * - Buscar feiras ativas (via useFairsQuery)
 * - Permitir busca por nome
 * - Retornar a feira selecionada via callback onSelect
 *
 * Observação:
 * - Este componente NÃO cria vínculo e NÃO solicita stallsQty.
 * - Ele é apenas um "picker" reutilizável.
 */
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (fair: Fair) => void
}

export function SelectActiveFairDialog({ open, onOpenChange, onSelect }: Props) {
  const [q, setQ] = useState("")

  // Busca apenas feiras ativas, como você pediu.
  const fairsQuery = useFairsQuery({ status: "ATIVA" })
  const fairs = fairsQuery.data ?? []

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return fairs
    return fairs.filter((f) => f.name.toLowerCase().includes(term))
  }, [q, fairs])

  function handlePick(fair: Fair) {
    onSelect(fair)
    onOpenChange(false)
    setQ("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Selecionar feira ativa
          </DialogTitle>

          <DialogDescription>
            Escolha a feira na qual o interessado será vinculado. Apenas feiras com status <b>ATIVA</b> aparecem aqui.
          </DialogDescription>

          <Separator className="mt-4" />

          <div className="mt-4 flex items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar feira pelo nome..."
                className="pl-9"
              />
            </div>

            <Badge variant="secondary" className="rounded-full">
              {filtered.length}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[420px] px-6 pb-6">
          {fairsQuery.isLoading && (
            <div className="text-sm text-muted-foreground py-8">Carregando feiras ativas…</div>
          )}

          {fairsQuery.isError && (
            <div className="text-sm text-destructive py-8">
              Não foi possível carregar as feiras. Verifique o backend e tente novamente.
            </div>
          )}

          {!fairsQuery.isLoading && !fairsQuery.isError && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground py-8">
              Nenhuma feira ativa encontrada com esse termo.
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((fair) => (
              <button
                key={fair.id}
                onClick={() => handlePick(fair)}
                className="w-full text-left rounded-xl border bg-background/50 hover:bg-muted/40 transition p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{fair.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground break-all">{fair.id}</div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Badge className="rounded-full">{fair.status}</Badge>
                  <Check className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
