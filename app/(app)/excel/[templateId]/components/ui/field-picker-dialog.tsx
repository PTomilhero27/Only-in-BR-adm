"use client"

/**
 * FieldPickerDialog
 *
 * Responsabilidade:
 * - Permitir buscar e selecionar um campo (fieldKey) de forma guiada
 * - Mostrar label + fieldKey + format e (opcionalmente) uma descrição curta
 *
 * Decisão:
 * - Usamos shadcn Command para UX de busca rápida (estilo palette)
 * - A lista é agrupada por “grupo” (dataset/section) para ficar fácil entender
 */

import * as React from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

import type { ExcelDatasetField } from "@/app/modules/excel/excel.schema"

type FieldGroup = {
  title: string
  fields: ExcelDatasetField[]
}

/** Agrupa por “grupo” se existir; senão cai no datasetLabel */
function groupFields(fields: ExcelDatasetField[]) {
  const by = new Map<string, ExcelDatasetField[]>()

  for (const f of fields) {
    // se seu backend tiver `group` ou `section`, usa aqui
    const key = (f as any).group ?? (f as any).section ?? "Campos"
    const arr = by.get(key) ?? []
    arr.push(f)
    by.set(key, arr)
  }

  const groups: FieldGroup[] = Array.from(by.entries()).map(([title, items]) => ({
    title,
    fields: items.sort((a, b) => (a.label ?? a.fieldKey).localeCompare(b.label ?? b.fieldKey)),
  }))

  // Campos sem grupo sempre por último
  groups.sort((a, b) => (a.title === "Campos" ? 1 : 0) - (b.title === "Campos" ? 1 : 0))
  return groups
}

export function FieldPickerDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  fields: ExcelDatasetField[]
  datasetLabel?: string
  onPick: (field: ExcelDatasetField) => void
}) {
  const { open, onOpenChange, fields, datasetLabel, onPick } = props
  const groups = React.useMemo(() => groupFields(fields), [fields])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Catálogo de dados</DialogTitle>
          <DialogDescription>
            Pesquise o dado que você quer puxar.
            {datasetLabel ? ` Dataset atual: ${datasetLabel}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/10">
          <Command>
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <CommandInput placeholder="Buscar por nome (ex.: endereço, total, pago, cpf, status…)" />
            </div>

            <CommandList className="max-h-[460px]">
              <CommandEmpty>Nenhum campo encontrado.</CommandEmpty>

              {groups.map((g) => (
                <CommandGroup key={g.title} heading={g.title}>
                  {g.fields.map((f) => (
                    <CommandItem
                      key={f.fieldKey}
                      value={`${f.label ?? ""} ${f.fieldKey}`}
                      onSelect={() => {
                        onPick(f)
                        onOpenChange(false)
                      }}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{f.label ?? f.fieldKey}</div>
                        <div className="truncate text-xs text-muted-foreground">{f.fieldKey}</div>
                        {(f as any).hint ? (
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {(f as any).hint}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {f.format ? <Badge variant="outline">{f.format}</Badge> : null}
                        <Button variant="secondary" size="sm" className="h-8">
                          Inserir
                        </Button>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  )
}
