/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

/**
 * MultiSheetGrid (2xN)
 *
 * Responsabilidade:
 * - Renderizar tabela 2 linhas:
 *   - Linha 1: header
 *   - Linha 2: bind (fieldKey)
 * - Permitir selecionar célula e abrir editor da coluna ao clicar
 *
 * Decisão:
 * - MULTI é intencionalmente simples: não é "Excel infinito", é uma tabela 2xN.
 * - O usuário edita sempre "por coluna".
 */
import * as React from "react"
import { cn } from "@/lib/utils"
import type { ExcelTemplateSheetInput } from "@/app/modules/excel/excel.schema"

type CellCoord = { row: number; col: number } // 1-based

function colLabel(n: number) {
  let s = ""
  let x = n
  while (x > 0) {
    const m = (x - 1) % 26
    s = String.fromCharCode(65 + m) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

export function MultiSheetGrid(props: {
  sheet: ExcelTemplateSheetInput
  selected: CellCoord
  onSelect: (rc: CellCoord) => void
  onCellClick?: (rc: CellCoord) => void
  fieldLabelByKey?: Map<string, { label: string; format?: any }>
  className?: string
}) {
  const { sheet, selected, onSelect, onCellClick, fieldLabelByKey, className } = props

  const cols = ((sheet as any).multiColumns ?? []) as Array<{
    id: string
    header: string
    fieldKey: string
    format?: any
  }>

  const totalCols = Math.max(1, cols.length)

  function displayBind(fieldKey: string) {
    if (!fieldKey) return ""
    const meta = fieldLabelByKey?.get(fieldKey)
    return meta?.label ? `{{${meta.label}}}` : `{{${fieldKey}}}`
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      onSelect({ row: selected.row, col: Math.max(1, selected.col - 1) })
      return
    }
    if (e.key === "ArrowRight") {
      e.preventDefault()
      onSelect({ row: selected.row, col: Math.min(totalCols, selected.col + 1) })
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      onSelect({ row: 1, col: selected.col })
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      onSelect({ row: 2, col: selected.col })
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      onCellClick?.(selected)
      return
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Planilha</div>
          <div className="text-xs text-muted-foreground">
            Multi dados: header + bind (2 linhas) • Clique para editar a coluna
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Clique para selecionar • Enter para editar</div>
      </div>

      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="w-full overflow-auto rounded-2xl border bg-background outline-none"
        aria-label="Grade MULTI (2xN)"
      >
        <div className="min-w-[900px]">
          {/* Cabeçalho com letras (A, B, C...) */}
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${totalCols}, minmax(180px, 1fr))` }}>
            <div className="flex h-10 items-center justify-center border-b border-r bg-muted/40 text-xs text-muted-foreground">
              #
            </div>
            {Array.from({ length: totalCols }).map((_, i) => (
              <div
                key={`col-${i}`}
                className="flex h-10 items-center justify-center border-b border-r bg-muted/40 text-xs font-medium text-muted-foreground"
              >
                {colLabel(i + 1)}
              </div>
            ))}
          </div>

          {/* Linha 1: header */}
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${totalCols}, minmax(180px, 1fr))` }}>
            <div className="flex h-12 items-center justify-center border-b border-r bg-muted/40 text-xs text-muted-foreground">
              1
            </div>
            {Array.from({ length: totalCols }).map((_, i) => {
              const rc: CellCoord = { row: 1, col: i + 1 }
              const isSelected = selected.row === 1 && selected.col === i + 1
              const col = cols[i]
              const value = col?.header ?? ""

              return (
                <button
                  key={`h-${i}`}
                  type="button"
                  onClick={() => {
                    onSelect(rc)
                    onCellClick?.(rc)
                  }}
                  className={cn(
                    "h-12 border-b border-r px-3 text-left text-sm hover:bg-muted/40",
                    isSelected && "ring-2 ring-orange-500",
                  )}
                  title={`Header • Coluna ${i + 1}`}
                >
                  <div className="truncate">{value || <span className="text-muted-foreground">—</span>}</div>
                </button>
              )
            })}
          </div>

          {/* Linha 2: bind */}
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${totalCols}, minmax(180px, 1fr))` }}>
            <div className="flex h-12 items-center justify-center border-b border-r bg-muted/40 text-xs text-muted-foreground">
              2
            </div>

            {Array.from({ length: totalCols }).map((_, i) => {
              const rc: CellCoord = { row: 2, col: i + 1 }
              const isSelected = selected.row === 2 && selected.col === i + 1
              const col = cols[i]
              const value = displayBind(col?.fieldKey ?? "")

              return (
                <button
                  key={`b-${i}`}
                  type="button"
                  onClick={() => {
                    onSelect(rc)
                    onCellClick?.(rc)
                  }}
                  className={cn(
                    "h-12 border-b border-r px-3 text-left text-sm hover:bg-muted/40",
                    isSelected && "ring-2 ring-orange-500",
                  )}
                  title={`Bind • Coluna ${i + 1}`}
                >
                  <div className="truncate">{value || <span className="text-muted-foreground">—</span>}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
