"use client"

/**
 * SheetsTabs (fix overflow no modal)
 *
 * Melhorias:
 * - Lista de abas com overflow-x-auto (não estoura o modal)
 * - “Pill” com max-width e input com largura controlada
 * - No modal: aba ativa mostra input embaixo (layout estável)
 */

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { ExcelTemplateSheetInputSchema, type ExcelTemplateSheetInput } from "@/app/modules/excel/excel.schema"

function makeNewSheet(order: number): ExcelTemplateSheetInput {
  return ExcelTemplateSheetInputSchema.parse({
    name: `Aba ${order + 1}`,
    order,
    dataset: "FAIR",
    cells: [],
    tables: [],
  })
}

export function SheetsTabs(props: {
  sheets: ExcelTemplateSheetInput[]
  activeIndex: number
  onChange: (nextSheets: ExcelTemplateSheetInput[], nextIndex: number) => void
  variant?: "default" | "modal"
}) {
  const { sheets, activeIndex, onChange, variant = "default" } = props

  function addSheet() {
    const order = sheets.length
    const next = [...sheets, makeNewSheet(order)]
    onChange(next, next.length - 1)
  }

  function removeSheet(index: number) {
    if (sheets.length <= 1) return

    const next = sheets
      .filter((_, i) => i !== index)
      .map((s, i) =>
        ExcelTemplateSheetInputSchema.parse({
          ...s,
          order: i,
          cells: s.cells ?? [],
          tables: s.tables ?? [],
        }),
      )

    onChange(next, Math.max(0, index - 1))
  }

  function renameSheet(index: number, name: string) {
    const next = sheets.slice()
    next[index] = ExcelTemplateSheetInputSchema.parse({
      ...next[index],
      name,
      cells: next[index].cells ?? [],
      tables: next[index].tables ?? [],
    })
    onChange(next, activeIndex)
  }

  const compact = variant === "modal"

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size={compact ? "sm" : "sm"} onClick={addSheet}>
          <Plus className="mr-2 h-4 w-4" />
          Nova aba
        </Button>

        {/* ✅ A lista rola horizontalmente e NÃO estoura o container */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex items-center gap-2 pr-1">
            {sheets.map((s, i) => {
              const isActive = i === activeIndex

              return (
                <div key={`${s.order ?? i}-${i}`} className="flex flex-col">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-sm",
                      "min-w-[140px] max-w-[220px]",
                      isActive ? "ring-2 ring-orange-500/40" : "opacity-90",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onChange(sheets, i)}
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                      title={s.name}
                    >
                      {s.name}
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeSheet(i)}
                      disabled={sheets.length <= 1}
                      title={sheets.length <= 1 ? "Precisa ter ao menos 1 aba" : "Excluir aba"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* ✅ No modal: input fica embaixo para não “esticar” a linha */}
                  {compact && isActive ? (
                    <div className="mt-2">
                      <Input
                        className="h-9 w-[260px] max-w-full"
                        value={s.name}
                        onChange={(e) => renameSheet(i, e.target.value)}
                        placeholder="Nome da aba"
                      />
                    </div>
                  ) : null}

                  {/* ✅ No modo normal (fora do modal) pode manter como você quiser;
                      aqui deixei sem input inline para manter clean */}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
