'use client'

import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, Search } from 'lucide-react'
import type { Fair } from '@/app/modules/fairs/types'
import { getFairCapacityInfo } from '@/app/modules/interest-fairs/hooks/use-owner-fair-link-form'

/**
 * FairPicker
 *
 * Responsabilidade:
 * - Lista feiras e permite selecionar uma
 * - Exibe capacidade/reservadas/restantes de forma clara (regra nova)
 */

export function FairPicker(props: {
  fairs: Fair[]
  selected: Fair | null
  onSelect: (fair: Fair) => void
  onClear: () => void
  busy?: boolean
  search: string
  setSearch: (v: string) => void
}) {
  const { fairs, selected, onSelect, onClear, busy, search, setSearch } = props

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return fairs
    return fairs.filter((f) => f.name.toLowerCase().includes(term))
  }, [fairs, search])

  if (selected) {
    const cap = getFairCapacityInfo(selected)

    return (
      <div className="rounded-2xl border bg-background/60 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{selected.name}</div>
            <div className="mt-1 text-xs text-muted-foreground break-all">{selected.id}</div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Badge className="rounded-full">{selected.status}</Badge>
            <Button variant="outline" onClick={onClear} disabled={busy}>
              Trocar
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background/50 p-3">
            <div className="text-xs text-muted-foreground">Capacidade</div>
            <div className="mt-1 text-lg font-semibold">{cap.capacity}</div>
          </div>

          <div className="rounded-xl border bg-background/50 p-3">
            <div className="text-xs text-muted-foreground">Reservadas</div>
            <div className="mt-1 text-lg font-semibold">{cap.reserved}</div>
          </div>

          <div className="rounded-xl border bg-background/50 p-3">
            <div className="text-xs text-muted-foreground">Restantes</div>
            <div className="mt-1 text-lg font-semibold">{cap.remaining}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-background p-3 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar feira pelo nome..."
          className="pl-9"
          disabled={busy}
        />
      </div>

      <ScrollArea className="h-[240px] pr-2">
        <div className="space-y-2">
          {filtered.map((fair) => {
            const cap = getFairCapacityInfo(fair)
            return (
              <button
                key={fair.id}
                onClick={() => onSelect(fair)}
                className="w-full text-left rounded-2xl border bg-background/50 hover:bg-muted/40 transition p-4 flex items-start justify-between gap-3"
                disabled={busy}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{fair.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground break-all">{fair.id}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      Restantes: {cap.remaining}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      Capacidade: {cap.capacity}
                    </Badge>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Badge className="rounded-full">{fair.status}</Badge>
                  <Check className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground py-6">Nenhuma feira ativa encontrada.</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
