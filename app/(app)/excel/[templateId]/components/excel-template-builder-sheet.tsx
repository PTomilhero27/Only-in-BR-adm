"use client"

/**
 * ExcelTemplateBuilderSheet
 *
 * Responsabilidade:
 * - Carregar template
 * - Controlar estado das abas
 * - Controlar seleção de célula
 * - Abrir modal de edição da célula
 * - Persistir alterações no backend
 *
 * Decisão:
 * - Toda edição de célula acontece dentro de um Dialog
 * - Grid é apenas visual
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"

import {
  useExcelDatasetsQuery,
  useExcelDatasetFieldsQuery,
  useExcelTemplateQuery,
  useUpdateExcelTemplateMutation,
} from "@/app/modules/excel/excel.queries"

import type {
  ExcelDataset,
  ExcelDatasetField,
  ExcelDatasetItem,
  ExcelTemplateSheetInput,
  ExcelTemplateCellInput,
} from "@/app/modules/excel/excel.schema"

import { BuilderTopBar } from "./ui/builder-top-bar"
import { ExcelGrid } from "./ui/excel-grid"
import { BuilderSettingsDialog } from "./ui/builder-settings-dialog"
import { CellEditDialog } from "./ui/cell-edit-dialog"

type CellCoord = { row: number; col: number }

function getCell(cells: ExcelTemplateCellInput[], rc: CellCoord) {
  return cells.find((c) => c.row === rc.row && c.col === rc.col) ?? null
}

function upsertCell(
  cells: ExcelTemplateCellInput[],
  rc: CellCoord,
  patch: Partial<ExcelTemplateCellInput> & { type?: "TEXT" | "BIND"; value?: string },
) {
  const idx = cells.findIndex((c) => c.row === rc.row && c.col === rc.col)

  const next: ExcelTemplateCellInput = {
    row: rc.row,
    col: rc.col,
    type: patch.type ?? (idx >= 0 ? cells[idx].type : "TEXT"),
    value: patch.value ?? (idx >= 0 ? cells[idx].value : ""),
    format: patch.format ?? (idx >= 0 ? cells[idx].format : undefined),
    bold: patch.bold ?? (idx >= 0 ? cells[idx].bold : false),
  }

  const isEmpty = (next.value ?? "").trim() === ""

  if (isEmpty) {
    if (idx >= 0) {
      const copy = cells.slice()
      copy.splice(idx, 1)
      return copy
    }
    return cells
  }

  if (idx >= 0) {
    const copy = cells.slice()
    copy[idx] = next
    return copy
  }

  return [...cells, next]
}

function removeCell(cells: ExcelTemplateCellInput[], rc: CellCoord) {
  const idx = cells.findIndex((c) => c.row === rc.row && c.col === rc.col)
  if (idx < 0) return cells
  const copy = cells.slice()
  copy.splice(idx, 1)
  return copy
}

export function ExcelTemplateBuilderSheet({ templateId }: { templateId: string }) {
  const router = useRouter()

  const templateQ = useExcelTemplateQuery(templateId)
  const datasetsQ = useExcelDatasetsQuery()
  const updateMut = useUpdateExcelTemplateMutation()

  const template = templateQ.data?.template

  const [sheets, setSheets] = React.useState<ExcelTemplateSheetInput[]>([])
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [selected, setSelected] = React.useState<CellCoord>({ row: 1, col: 1 })

  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editorCoord, setEditorCoord] = React.useState<CellCoord>({ row: 1, col: 1 })

  const [gridRows, setGridRows] = React.useState(100)
  const [gridCols, setGridCols] = React.useState(26)

  const visibleRows = 7
  const visibleCols = 7

  React.useEffect(() => {
    if (!template) return

    const next: ExcelTemplateSheetInput[] = template.sheets
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        name: s.name,
        order: s.order,
        dataset: s.dataset,
        cells: (s.cells ?? []).map((c) => ({
          row: c.row,
          col: c.col,
          type: c.type,
          value: c.value,
          format: c.format ?? undefined,
          bold: c.bold ?? false,
        })),
        tables: [],
      }))

    setSheets(next)
    setActiveIndex(0)
    setSelected({ row: 1, col: 1 })
    setGridRows(100)
    setGridCols(26)
  }, [template])

  const activeSheet = sheets[activeIndex]
  const activeDataset = activeSheet?.dataset as ExcelDataset | undefined

  const fieldsQ = useExcelDatasetFieldsQuery(activeDataset)
  const datasets: ExcelDatasetItem[] = datasetsQ.data?.items ?? []
  const fields: ExcelDatasetField[] = fieldsQ.data?.fields ?? []

  const isLoading = templateQ.isLoading || datasetsQ.isLoading

  function updateActiveSheet(next: ExcelTemplateSheetInput) {
    setSheets((prev) => {
      const copy = prev.slice()
      copy[activeIndex] = next
      return copy
    })
  }

  function openEditor(rc: CellCoord) {
    setSelected(rc)
    setEditorCoord(rc)
    setEditorOpen(true)
  }

  function onPatchCell(rc: CellCoord, patch: Partial<ExcelTemplateCellInput> & { type?: "TEXT" | "BIND"; value?: string }) {
    const nextCells = upsertCell(activeSheet.cells ?? [], rc, patch)
    updateActiveSheet({ ...activeSheet, cells: nextCells })
  }

  async function handleSave() {
    try {
      await updateMut.mutateAsync({
        templateId,
        input: { sheets },
      })
      toast.success({ title: "Template salvo com sucesso." })
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar template.")
    }
  }

  const editorCell = React.useMemo(() => {
    if (!activeSheet) return null
    return getCell(activeSheet.cells ?? [], editorCoord)
  }, [activeSheet, editorCoord])

  const bindOptions = React.useMemo(() => {
    return (fields ?? []).map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label ?? f.fieldKey,
      format: (f as any).format ?? undefined,
    }))
  }, [fields])

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
  }

  if (!template || !activeSheet) {
    return <div className="p-6 text-sm text-muted-foreground">Template não encontrado.</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <BuilderTopBar
        title={template.name}
        status={template.status}
        onBack={() => router.push("/excel")}
        onSave={handleSave}
        saving={updateMut.isPending}
        rightSlot={
          <BuilderSettingsDialog
            sheets={sheets}
            activeIndex={activeIndex}
            onChangeSheets={(nextSheets, nextIndex) => {
              setSheets(nextSheets)
              setActiveIndex(nextIndex)
              setSelected({ row: 1, col: 1 })
            }}
            gridRows={gridRows}
            setGridRows={setGridRows}
            gridCols={gridCols}
            setGridCols={setGridCols}
          />
        }
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-4">
        <div className="rounded-2xl border bg-muted/10 shadow-sm">
          <div className="h-[580px] p-3">
            <ExcelGrid
              sheet={activeSheet}
              selected={selected}
              onSelect={(rc) => setSelected(rc)}
              onCellClick={(rc) => openEditor(rc)}
              totalRows={gridRows}
              totalCols={gridCols}
            />
          </div>
        </div>
      </div>

      <CellEditDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        coord={editorCoord}
        cell={editorCell}
        bindOptions={bindOptions}
        onSave={(patch) => onPatchCell(editorCoord, patch)}
        onClear={() => {
          const nextCells = removeCell(activeSheet.cells ?? [], editorCoord)
          updateActiveSheet({ ...activeSheet, cells: nextCells })
        }}
      />
    </div>
  )
}
