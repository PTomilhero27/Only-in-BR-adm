// src/modules/excel/pages/excel-templates-page.tsx
"use client"

import { useMemo, useState } from "react"
import { FileSpreadsheet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ExcelTemplateListItem, ExcelTemplateStatus } from "@/app/modules/excel/excel.schema"
import { useCreateExcelTemplateMutation, useDeleteExcelTemplateMutation, useExcelTemplatesQuery, useUpdateExcelTemplateMutation } from "@/app/modules/excel/excel.queries"
import { ExcelTemplatesFiltersBar } from "./components/excel-templates-filters-bar"
import { ExcelTemplateUpsertDialog } from "./components/excel-template-upsert-dialog"
import { ExportExcelDialog } from "./components/export-excel-dialog"
import { ExcelTemplateDeleteAlertDialog } from "./components/excel-template-delete-alert-dialog"
import { ExcelTemplatesTable } from "./components/excel-templates-table"
import { toast } from "@/components/ui/toast"






/**
 * Página principal do módulo Excel.
 * Responsabilidade:
 * - Listar templates
 * - Buscar/filtrar no front (MVP)
 * - Abrir dialogs de criar/editar/excluir
 * - Abrir dialog de exportação do .xlsx
 */
export default function ExcelTemplatesPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<ExcelTemplateStatus | "ALL">("ALL")

  const [upsertOpen, setUpsertOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const [selected, setSelected] = useState<ExcelTemplateListItem | null>(null)

  const list = useExcelTemplatesQuery()
  const createMut = useCreateExcelTemplateMutation()
  const updateMut = useUpdateExcelTemplateMutation()
  const deleteMut = useDeleteExcelTemplateMutation()

  const filtered = useMemo(() => {
    const items = list.data?.items ?? []
    const q = query.trim().toLowerCase()

    return items
      .filter((t) => (status === "ALL" ? true : t.status === status))
      .filter((t) => (q ? t.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [list.data, query, status])

  function openCreate() {
    setSelected(null)
    setUpsertOpen(true)
  }

  function openEdit(item: ExcelTemplateListItem) {
    setSelected(item)
    setUpsertOpen(true)
  }

  function openDelete(item: ExcelTemplateListItem) {
    setSelected(item)
    setDeleteOpen(true)
  }

  function openExport(item: ExcelTemplateListItem) {
    setSelected(item)
    setExportOpen(true)
  }

  async function handleUpsert(input: { name: string; status: ExcelTemplateStatus }) {
    if (!selected) {
      await createMut.mutateAsync({
        name: input.name,
        status: input.status,
        sheets: [
          {
            name: "Relatório",
            order: 0,
            dataset: "FAIR",
            cells: [],
            tables: [],
          },
        ],
      })
      setUpsertOpen(false)
      toast.success({title: "Template criado com sucesso."})
      return
    }

    await updateMut.mutateAsync({
      templateId: selected.id,
      input: {
        name: input.name,
        status: input.status,
      },
    })
    setUpsertOpen(false)
  }

  async function handleDelete() {
    if (!selected) return
    await deleteMut.mutateAsync(selected.id)
    setDeleteOpen(false)
  }

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FileSpreadsheet className="h-6 w-6" />
            Relatórios (Excel)
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie templates e exporte planilhas .xlsx por feira e expositor, sem código hardcoded.
          </p>
        </div>

        <Button onClick={openCreate}>Novo template</Button>
      </header>

      <ExcelTemplatesFiltersBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
      />

      {list.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <ExcelTemplatesTable
          items={filtered}
          onEdit={openEdit}
          onDelete={openDelete}
          onExport={openExport}
          isMutating={createMut.isPending || updateMut.isPending || deleteMut.isPending}
        />
      )}

      <ExcelTemplateUpsertDialog
        open={upsertOpen}
        onOpenChange={setUpsertOpen}
        mode={selected ? "edit" : "create"}
        initialValues={{
          name: selected?.name ?? "",
          status: selected?.status ?? "ACTIVE",
        }}
        onSubmit={handleUpsert}
        isSubmitting={createMut.isPending || updateMut.isPending}
      />

      <ExcelTemplateDeleteAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        templateName={selected?.name ?? ""}
        onConfirm={handleDelete}
        isDeleting={deleteMut.isPending}
      />

      <ExportExcelDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        templateId={selected?.id ?? ""}
        templateName={selected?.name ?? ""}
      />
    </div>
  )
}
