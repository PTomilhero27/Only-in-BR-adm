"use client"

/**
 * EntityCombobox
 *
 * Responsabilidade:
 * - Selecionar uma entidade (fair, owner, stall, etc)
 * - Trabalhar com id + label
 * - Reutilizável em qualquer módulo
 *
 * Decisão:
 * - Usa Popover + Command (shadcn)
 * - Não depende de domínio específico
 * - Recebe lista pronta (backend já resolveu escopo)
 */

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type EntityComboboxItem = {
  id: string
  label: string
  description?: string
  disabled?: boolean
}

export function EntityCombobox(props: {
  value?: string
  onChange: (value: string | undefined) => void
  items: EntityComboboxItem[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}) {
  const {
    value,
    onChange,
    items,
    placeholder = "Selecionar...",
    emptyText = "Nenhum resultado encontrado.",
    disabled,
    className,
  } = props

  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(
    () => items.find((i) => i.id === value),
    [items, value],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            <CommandGroup>
              {items.map((item) => {
                const isSelected = item.id === value

                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.id}`}
                    disabled={item.disabled}
                    onSelect={() => {
                      if (item.disabled) return

                      onChange(item.id === value ? undefined : item.id)
                      setOpen(false)
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {item.label}
                      </span>

                      <Check
                        className={cn(
                          "h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </div>

                    {item.description ? (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
