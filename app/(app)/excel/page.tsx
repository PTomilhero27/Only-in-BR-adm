// src/modules/excel/pages/excel-templates-page.tsx
"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

import type {
  ExcelTemplateListItem,
  ExcelTemplateScope,
  ExcelTemplateStatus,
} from "@/app/modules/excel/excel.schema";

import {
  useCreateExcelTemplateMutation,
  useDeleteExcelTemplateMutation,
  useExcelTemplatesQuery,
  useUpdateExcelTemplateMutation,
} from "@/app/modules/excel/excel.queries";

import { ExcelTemplatesFiltersBar } from "./components/excel-templates-filters-bar";
import { ExcelTemplateUpsertDialog } from "./components/excel-template-upsert-dialog";
import { ExportExcelDialog } from "./components/export-excel-dialog";
import { ExcelTemplateDeleteAlertDialog } from "./components/excel-template-delete-alert-dialog";
import { ExcelTemplatesTable } from "./components/excel-templates-table";
import { toast } from "@/components/ui/toast";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";

/**
 * Página principal do módulo Excel (Admin).
 *
 * Responsabilidade:
 * - Listar templates
 * - Buscar/filtrar no front (MVP)
 * - Abrir dialogs de criar/editar/excluir
 * - Abrir dialog de exportação do .xlsx
 *
 * Decisões:
 * - GET /excel-templates retorna array direto (ExcelTemplateListItemDto[])
 * - Ao criar template, dataset default deve bater com o enum do Prisma (ex.: FAIR_INFO)
 * - UI com hero para deixar a área mais clean/tech e com cara de produto
 */
export default function ExcelTemplatesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ExcelTemplateStatus | "ALL">("ALL");

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [selected, setSelected] = useState<ExcelTemplateListItem | null>(null);

  const list = useExcelTemplatesQuery();
  const createMut = useCreateExcelTemplateMutation();
  const updateMut = useUpdateExcelTemplateMutation();
  const deleteMut = useDeleteExcelTemplateMutation();

  const filtered = useMemo(() => {
    const items = list.data ?? [];
    const q = query.trim().toLowerCase();

    return items
      .filter((t) => (status === "ALL" ? true : t.status === status))
      .filter((t) => (q ? t.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [list.data, query, status]);

  const isMutating =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  function openCreate() {
    setSelected(null);
    setUpsertOpen(true);
  }

  function openEdit(item: ExcelTemplateListItem) {
    setSelected(item);
    setUpsertOpen(true);
  }

  function openDelete(item: ExcelTemplateListItem) {
    setSelected(item);
    setDeleteOpen(true);
  }

  function openExport(item: ExcelTemplateListItem) {
    setSelected(item);
    setExportOpen(true);
  }

  /**
   * ✅ Upsert agora suporta scope (novo modelo).
   * - CREATE: envia scope + 1 sheet default em FAIR_INFO
   * - UPDATE: envia scope também (evita divergência no backend)
   */
  async function handleUpsert(input: {
    name: string;
    status: ExcelTemplateStatus;
    scope: ExcelTemplateScope;
  }) {
    try {
      if (!selected) {
        await createMut.mutateAsync({
          name: input.name,
          status: input.status,
          scope: input.scope, // ✅ FIX: enviar scope
          sheets: [
            {
              name: "Relatório",
              order: 0,
              dataset: "FAIR_INFO", // ✅ FIX: enum compatível com Prisma
              cells: [],
              tables: [],
            },
          ],
        });

        setUpsertOpen(false);
        toast.success({ title: "Template criado com sucesso." });
        return;
      }

      await updateMut.mutateAsync({
        templateId: selected.id,
        input: {
          name: input.name,
          status: input.status,
          scope: input.scope, // ✅ FIX: enviar scope no update também
        },
      });

      setUpsertOpen(false);
      toast.success({ title: "Template atualizado com sucesso." });
    } catch (err: any) {
      toast.error({
        title: "Não foi possível salvar o template.",
        subtitle: err?.message ?? "Tente novamente.",
      });
    }
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteMut.mutateAsync(selected.id);
      setDeleteOpen(false);
      toast.success({ title: "Template removido com sucesso." });
    } catch (err: any) {
      toast.error({
        title: "Não foi possível remover o template.",
        subtitle: err?.message ?? "Tente novamente.",
      });
    }
  }

  return (
    <div className="space-y-6 p-6">

      <AppBreadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Relatórios" },
        ]}
      />

      {/* HERO / HEADER */}
      <Card className="relative overflow-hidden border bg-card">
        {/* fundo decorativo (clean/tech) */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-background">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Relatórios (Excel)
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Crie templates e exporte planilhas .xlsx por
                    feira/expositor, sem código hardcoded.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={openCreate}
                disabled={isMutating}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo template
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* FILTROS */}
      <Card className="p-4 sm:p-5">
        <ExcelTemplatesFiltersBar
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
        />
      </Card>

      {/* LISTAGEM */}
      <Card className="p-0">
        {list.isLoading ? (
          <div className="space-y-3 p-4 sm:p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : (
          <div className="p-2 sm:p-3">
            <ExcelTemplatesTable
              items={filtered}
              onEdit={openEdit}
              onDelete={openDelete}
              onExport={openExport}
              isMutating={isMutating}
            />
          </div>
        )}
      </Card>

      {/* DIALOGS */}
      <ExcelTemplateUpsertDialog
        key={`${selected?.id ?? "new"}:${selected ? "edit" : "create"}`}
        open={upsertOpen}
        onOpenChange={setUpsertOpen}
        mode={selected ? "edit" : "create"}
        initialValues={{
          name: selected?.name ?? "",
          status: selected?.status ?? "ACTIVE",
          scope: selected?.scope ?? "FAIR",
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
  );
}
