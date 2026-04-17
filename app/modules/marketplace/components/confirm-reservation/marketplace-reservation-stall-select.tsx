"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Card } from "@/components/ui/card"
import { stallSizeLabel, type StallSize } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import type {
  ReservationLinkedStall,
  ReservationStallOption,
} from "./confirm-marketplace-reservation.utils"

export function MarketplaceReservationStallSelect(props: {
  loading?: boolean
  loadError?: string | null
  reservationTentType: StallSize | null
  selectedStallId: string
  selectedStall: ReservationLinkedStall | null
  options: ReservationStallOption[]
  onSelectStallId: (stallId: string) => void
  onClear: () => void
}) {
  const {
    loading,
    loadError,
    reservationTentType,
    selectedStallId,
    selectedStall,
    options,
    onSelectStallId,
    onClear,
  } = props

  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return options

    return options.filter((option) => option.searchText.includes(normalizedSearch))
  }, [options, search])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Selecao da barraca</div>
          <div className="text-xs text-muted-foreground">
            {reservationTentType
              ? `Somente barracas ${stallSizeLabel(reservationTentType)} sao compativeis com esta reserva.`
              : "O vinculo da barraca e opcional nesta etapa."}
          </div>
        </div>

        {selectedStallId ? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
            Limpar
          </Button>
        ) : null}
      </div>

      <Card className="rounded-2xl border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Barraca selecionada
            </div>
            <div className="mt-2 break-words text-sm font-semibold">
              {selectedStall?.stallName ?? "Nenhuma barraca selecionada"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {selectedStallId
                ? "Esta barraca sera vinculada automaticamente a feira ao confirmar a reserva."
                : "Se houver barraca vinculada, ela tambem sera vinculada automaticamente a feira."}
            </div>
          </div>

          {selectedStall?.stallSize ? (
            <Badge variant="secondary" className="rounded-full">
              {stallSizeLabel(selectedStall.stallSize)}
            </Badge>
          ) : null}
        </div>

        {selectedStall?.ownerName ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Expositor vinculado: <span className="font-medium">{selectedStall.ownerName}</span>
          </div>
        ) : null}
      </Card>

      <div className="rounded-2xl border bg-background">
        <Command className="border-none shadow-none">
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar barraca compativel..."
            className="h-10 text-sm"
          />
          <CommandList className="max-h-56 overflow-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Carregando barracas compativeis...
              </div>
            ) : (
              <>
                <CommandEmpty className="py-6 text-sm text-muted-foreground">
                  {loadError ?? "Nenhuma barraca compativel encontrada."}
                </CommandEmpty>
                <CommandGroup heading={options.length ? "Disponiveis para vinculo" : undefined}>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={`${option.stallId}-${option.stallFairId ?? "stall"}`}
                      value={option.searchText}
                      onSelect={() => onSelectStallId(option.stallId)}
                      className="cursor-pointer py-3"
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{option.stallName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {[option.ownerName, option.stallSize ? stallSizeLabel(option.stallSize) : null]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        </div>

                        {selectedStallId === option.stallId ? (
                          <Badge className="rounded-full bg-emerald-100 text-emerald-700">
                            Selecionada
                          </Badge>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
