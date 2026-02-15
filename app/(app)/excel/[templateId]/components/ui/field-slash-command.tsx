"use client"

/**
 * FieldSlashCommand
 *
 * Responsabilidade:
 * - Exibir um "Command palette" (shadcn/ui) ancorado no input (PopoverAnchor asChild)
 * - Filtrar campos conforme o usuário digita após "/"
 * - Retornar o campo selecionado para virar BIND na célula
 *
 * Decisão:
 * - Radix Popover não aceita "anchor" prop no Content.
 * - A forma correta é: PopoverAnchor + asChild no input.
 */

import * as React from "react"
import { Hash, Search } from "lucide-react"

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

export type BindOption = {
  fieldKey: string
  label: string
  format?: "TEXT" | "INT" | "MONEY_CENTS" | "DATE" | "DATETIME" | "BOOL"
}

export function FieldSlashCommand(props: {
  open: boolean
  onOpenChange: (open: boolean) => void

  /** Lista completa de campos possíveis para o dataset da aba */
  options: BindOption[]

  /** Texto atual após "/" (usado para filtrar) */
  query: string
  onQueryChange: (q: string) => void

  /** Campo selecionado */
  onPick: (opt: BindOption) => void

  /**
   * O input (ou wrapper) que será a âncora do popover.
   * Ex.: <FieldSlashCommand ...><input .../></FieldSlashCommand>
   */
  children: React.ReactNode
}) {
  const { open, onOpenChange, options, query, onQueryChange, onPick, children } = props

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const hay = `${o.label} ${o.fieldKey}`.toLowerCase()
      return hay.includes(q)
    })
  }, [options, query])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>

      <PopoverContent side="bottom" align="start" className="w-[420px] p-0">
        <Command>
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Digite para buscar • Enter para inserir</div>
          </div>

          {/* input do Command é onde a busca acontece */}
          <CommandInput value={query} onValueChange={onQueryChange} placeholder="Buscar campo… (ex: nome, total)" />

          <CommandList className="max-h-[280px]">
            <CommandEmpty>Nenhum campo encontrado.</CommandEmpty>

            <CommandGroup heading="Campos do dataset">
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.fieldKey}
                  value={`${opt.label} ${opt.fieldKey}`}
                  onSelect={() => onPick(opt)}
                  className="flex items-center justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate text-sm">{opt.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{opt.fieldKey}</div>
                    </div>
                  </div>

                  {opt.format ? (
                    <Badge variant="outline" className="text-[11px]">
                      {opt.format}
                    </Badge>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
