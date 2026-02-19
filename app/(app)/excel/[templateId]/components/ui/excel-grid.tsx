"use client"

/**
 * ExcelGrid (SINGLE - virtualizado + scroll real)
 *
 * Responsabilidade:
 * - Renderizar grade estilo Excel com totalRows/totalCols
 * - SINGLE é uma tabela livre (default 10x10)
 * - Exibir BIND de forma amigável no grid (label do catálogo)
 *
 * Ajuste UX (importante):
 * - A altura do grid agora é responsiva:
 *   - Se a planilha for pequena, o grid ENCOLHE e termina na última linha.
 *   - Se a planilha for grande, o grid ocupa o restante da tela e vira scrollável.
 * - Implementação via CSS: height = min(calc(100vh - offset), totalHeightPx)
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import type { ExcelTemplateSheetInput, ExcelTemplateCellInput } from "@/app/modules/excel/excel.schema"

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

function keyOf(rc: CellCoord) {
  return `${rc.row}:${rc.col}`
}

function buildCellMap(cells: ExcelTemplateCellInput[]) {
  const map = new Map<string, ExcelTemplateCellInput>()
  for (const c of cells) map.set(`${c.row}:${c.col}`, c)
  return map
}

const CellButton = React.memo(function CellButton(props: {
  rc: CellCoord
  isSelected: boolean
  display: string
  onClick: () => void
  cellW: number
  cellH: number
}) {
  const { rc, isSelected, display, onClick, cellW, cellH } = props
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative select-none overflow-hidden border border-border/60 bg-background px-2 text-left text-sm",
        "hover:bg-muted/40 focus:outline-none",
        isSelected && "ring-2 ring-orange-500 ring-offset-0",
      )}
      style={{ width: cellW, height: cellH }}
      title={`R${rc.row}C${rc.col}`}
    >
      <div className="truncate">{display}</div>
    </button>
  )
})

export function ExcelGrid(props: {
  sheet: ExcelTemplateSheetInput

  selected: CellCoord
  onSelect: (rc: CellCoord) => void

  /** Clique (abre modal no pai) */
  onCellClick?: (rc: CellCoord) => void

  /** Totais */
  totalRows: number
  totalCols: number

  /** Label amigável dos binds */
  fieldLabelByKey?: Map<string, { label: string; format?: any }>

  /** Opcional: ajustar tamanho de célula */
  cellWidth?: number
  cellHeight?: number

  /** Overscan (renderiza um pouco a mais pra scroll ficar suave) */
  overscan?: number

  /**
   * ✅ controla “quanto sobra” da tela para o Excel
   * - Ajuste fino conforme o seu layout (TopBar + paddings + gaps).
   * - Se ficar pequeno/grande demais, altere esse número no Builder.
   */
  maxHeightOffsetPx?: number

  className?: string
}) {
  const {
    sheet,
    selected,
    onSelect,
    onCellClick,
    totalRows,
    totalCols,
    fieldLabelByKey,
    cellWidth = 180,
    cellHeight = 44,
    overscan = 2,
    maxHeightOffsetPx = 210, // ✅ bom default pro seu layout atual (pode ajustar)
    className,
  } = props

  const rowHeaderW = 56
  const colHeaderH = 40

  const cellMap = React.useMemo(() => buildCellMap(sheet.cells ?? []), [sheet.cells])

  const scrollerRef = React.useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = React.useState({ w: 800, h: 520 })
  const [scroll, setScroll] = React.useState({ left: 0, top: 0 })

  React.useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      setViewport({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setViewport({ w: el.clientWidth, h: el.clientHeight })

    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => setScroll({ left: el.scrollLeft, top: el.scrollTop })
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  const usableW = Math.max(0, viewport.w - rowHeaderW)
  const usableH = Math.max(0, viewport.h - colHeaderH)

  const visibleCols = Math.max(1, Math.floor(usableW / cellWidth))
  const visibleRows = Math.max(1, Math.floor(usableH / cellHeight))

  const colOffset = Math.max(0, Math.min(totalCols - 1, Math.floor(scroll.left / cellWidth)))
  const rowOffset = Math.max(0, Math.min(totalRows - 1, Math.floor(scroll.top / cellHeight)))

  const colStart = Math.max(0, colOffset - overscan)
  const rowStart = Math.max(0, rowOffset - overscan)
  const colEnd = Math.min(totalCols, colOffset + visibleCols + overscan)
  const rowEnd = Math.min(totalRows, rowOffset + visibleRows + overscan)

  const cols = React.useMemo(() => {
    const out: number[] = []
    for (let c = colStart + 1; c <= colEnd; c++) out.push(c)
    return out
  }, [colStart, colEnd])

  const rows = React.useMemo(() => {
    const out: number[] = []
    for (let r = rowStart + 1; r <= rowEnd; r++) out.push(r)
    return out
  }, [rowStart, rowEnd])

  const translateX = colStart * cellWidth
  const translateY = rowStart * cellHeight

  const totalW = totalCols * cellWidth + rowHeaderW
  const totalH = totalRows * cellHeight + colHeaderH

  function ensureVisible(rc: CellCoord) {
    const el = scrollerRef.current
    if (!el) return

    const targetLeft = (rc.col - 1) * cellWidth
    const targetTop = (rc.row - 1) * cellHeight

    const viewLeft = el.scrollLeft
    const viewTop = el.scrollTop
    const viewRight = viewLeft + usableW
    const viewBottom = viewTop + usableH

    const cellRight = targetLeft + cellWidth
    const cellBottom = targetTop + cellHeight

    let nextLeft = viewLeft
    let nextTop = viewTop

    if (targetLeft < viewLeft) nextLeft = targetLeft
    if (cellRight > viewRight) nextLeft = cellRight - usableW

    if (targetTop < viewTop) nextTop = targetTop
    if (cellBottom > viewBottom) nextTop = cellBottom - usableH

    el.scrollTo({ left: nextLeft, top: nextTop, behavior: "auto" })
  }

  function moveSelection(next: CellCoord) {
    const rc: CellCoord = {
      row: Math.max(1, Math.min(totalRows, next.row)),
      col: Math.max(1, Math.min(totalCols, next.col)),
    }
    onSelect(rc)
    ensureVisible(rc)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") return (e.preventDefault(), moveSelection({ row: selected.row - 1, col: selected.col }))
    if (e.key === "ArrowDown") return (e.preventDefault(), moveSelection({ row: selected.row + 1, col: selected.col }))
    if (e.key === "ArrowLeft") return (e.preventDefault(), moveSelection({ row: selected.row, col: selected.col - 1 }))
    if (e.key === "ArrowRight") return (e.preventDefault(), moveSelection({ row: selected.row, col: selected.col + 1 }))
    if (e.key === "Enter") return (e.preventDefault(), onCellClick?.(selected))
  }

  function displayForCell(cell: ExcelTemplateCellInput | undefined) {
    if (!cell) return ""
    if (cell.type !== "BIND") return cell.value ?? ""

    const fieldKey = cell.value ?? ""
    const meta = fieldLabelByKey?.get(fieldKey)
    if (meta?.label) return `{{${meta.label}}}`
    return `{{${fieldKey}}}`
  }

  // ✅ altura “inteligente”
  const heightCss = `min(calc(100vh - ${maxHeightOffsetPx}px), ${totalH}px)`

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Planilha</div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn("relative w-full overflow-auto rounded-2xl border bg-background outline-none")}
        style={{ height: heightCss }}
        aria-label="Grade do Excel"
      >
        <div style={{ width: totalW, height: totalH }} />

        <div className="pointer-events-none absolute inset-0">
          <div
            className="pointer-events-none absolute left-0 top-0 flex items-center justify-center border-b border-r bg-muted/40 text-xs text-muted-foreground"
            style={{ width: rowHeaderW, height: colHeaderH }}
          >
            #
          </div>

          <div
            className="absolute top-0"
            style={{ left: rowHeaderW, height: colHeaderH, transform: `translateX(${translateX}px)` }}
          >
            <div className="flex">
              {cols.map((c) => (
                <div
                  key={`col-${c}`}
                  className="flex items-center justify-center border-b border-r bg-muted/40 text-xs font-medium text-muted-foreground"
                  style={{ width: cellWidth, height: colHeaderH }}
                >
                  {colLabel(c)}
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute left-0"
            style={{ top: colHeaderH, width: rowHeaderW, transform: `translateY(${translateY}px)` }}
          >
            <div className="flex flex-col">
              {rows.map((r) => (
                <div
                  key={`row-${r}`}
                  className="flex items-center justify-center border-b border-r bg-muted/40 text-xs text-muted-foreground"
                  style={{ width: rowHeaderW, height: cellHeight }}
                >
                  {r}
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute"
            style={{
              left: rowHeaderW,
              top: colHeaderH,
              transform: `translate(${translateX}px, ${translateY}px)`,
            }}
          >
            <div className="flex flex-col">
              {rows.map((r) => (
                <div key={`r-${r}`} className="flex">
                  {cols.map((c) => {
                    const rc: CellCoord = { row: r, col: c }
                    const cell = cellMap.get(keyOf(rc))
                    const isSelected = selected.row === r && selected.col === c

                    const display = displayForCell(cell)

                    return (
                      <div key={`c-${r}-${c}`} className="pointer-events-auto">
                        <CellButton
                          rc={rc}
                          isSelected={isSelected}
                          display={display}
                          cellW={cellWidth}
                          cellH={cellHeight}
                          onClick={() => {
                            onSelect(rc)
                            onCellClick?.(rc)
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
