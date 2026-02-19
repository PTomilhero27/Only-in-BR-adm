"use client";

/**
 * SheetsList
 *
 * Responsabilidade:
 * - Gerenciar abas (criar, selecionar, renomear, excluir) em formato lista vertical
 * - UX ideal para modal: não quebra layout, não depende de scroll horizontal
 *
 * Regras importantes:
 * - dataset precisa ser um valor válido do ExcelDatasetSchema (ex.: FAIR_INFO)
 * - mode é UI-only e deve ser derivado do dataset (excelDatasetMode)
 */

import * as React from "react";
import { Plus, Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  ExcelTemplateSheetApiInputSchema,
  type ExcelTemplateSheetInput,
  type ExcelDataset,
  excelDatasetMode,
} from "@/app/modules/excel/excel.schema";

/**
 * Dataset default para novas abas.
 * Escolha segura: SINGLE básico da feira, evita criar MULTI sem intenção.
 */
const DEFAULT_SHEET_DATASET: ExcelDataset = "FAIR_INFO";

/**
 * Cria uma nova aba com defaults consistentes.
 * Importante:
 * - dataset precisa ser válido
 * - mode é derivado do dataset (UI-only)
 */
function makeNewSheet(order: number): ExcelTemplateSheetInput {
  const dataset = DEFAULT_SHEET_DATASET;
  const mode = excelDatasetMode(dataset);

  return ExcelTemplateSheetApiInputSchema.parse({
    name: `Aba ${order + 1}`,
    order,
    dataset,

    // UI-only (opcional, mas ajuda a manter estado consistente no Builder)
    mode,
    gridRows: mode === "SINGLE" ? 10 : 2,
    gridCols: 10,
    multiColumns: mode === "MULTI" ? [] : undefined,

    // backend-supported
    cells: mode === "SINGLE" ? [] : [],
    tables: [],
  });
}

/**
 * Normaliza uma aba após operações de lista (renomear, reorder, etc).
 * Objetivo:
 * - garantir order coerente
 * - garantir arrays presentes
 * - manter UI-only coerente com dataset
 */
function normalizeSheetForUi(sheet: ExcelTemplateSheetInput, order: number): ExcelTemplateSheetInput {
  const dataset = sheet.dataset;
  const mode = excelDatasetMode(dataset);

  return ExcelTemplateSheetApiInputSchema.parse({
    ...sheet,
    order,

    // garante consistência mínima para o Builder
    mode,
    gridRows: mode === "SINGLE" ? (sheet.gridRows && sheet.gridRows > 0 ? sheet.gridRows : 10) : 2,
    gridCols: sheet.gridCols && sheet.gridCols > 0 ? sheet.gridCols : 10,
    multiColumns: mode === "MULTI" ? (sheet.multiColumns ?? []) : undefined,

    // backend-supported
    cells: sheet.cells ?? [],
    tables: sheet.tables ?? [],
  });
}

export function SheetsList(props: {
  sheets: ExcelTemplateSheetInput[];
  activeIndex: number;
  onChange: (nextSheets: ExcelTemplateSheetInput[], nextIndex: number) => void;
}) {
  const { sheets, activeIndex, onChange } = props;

  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState("");

  function addSheet() {
    const order = sheets.length;
    const next = [...sheets, makeNewSheet(order)];
    onChange(next, next.length - 1);
  }

  function removeSheet(index: number) {
    if (sheets.length <= 1) return;

    const next = sheets
      .filter((_, i) => i !== index)
      .map((s, i) => normalizeSheetForUi(s, i));

    const nextIndex = Math.max(0, index - 1);
    onChange(next, nextIndex);

    if (editingIndex === index) {
      setEditingIndex(null);
      setDraft("");
    }
  }

  function startRename(index: number) {
    setEditingIndex(index);
    setDraft(sheets[index]?.name ?? "");
  }

  function commitRename() {
    if (editingIndex === null) return;

    const name = draft.trim() || `Aba ${editingIndex + 1}`;

    const next = sheets.slice();
    next[editingIndex] = normalizeSheetForUi(
      {
        ...next[editingIndex],
        name,
      },
      next[editingIndex].order ?? editingIndex,
    );

    onChange(next, activeIndex);
    setEditingIndex(null);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Abas</div>
        <Button variant="secondary" size="sm" onClick={addSheet} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova aba
        </Button>
      </div>

      <div className="rounded-2xl border bg-background">
        <div className="divide-y">
          {sheets.map((s, i) => {
            const isActive = i === activeIndex;
            const isEditing = i === editingIndex;

            return (
              <div
                key={`${s.order ?? i}-${i}`}
                className={cn("flex items-center gap-2 px-3 py-2", isActive && "bg-orange-50/60")}
              >
                {/* Seleção */}
                <button
                  type="button"
                  onClick={() => onChange(sheets, i)}
                  className="min-w-0 flex-1 text-left"
                  title={s.name}
                >
                  <div className="truncate text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">Aba {i + 1}</div>
                </button>

                {/* Renomear inline */}
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      className="h-9 w-[240px]"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") {
                          setEditingIndex(null);
                          setDraft("");
                        }
                      }}
                    />
                    <Button size="sm" onClick={commitRename}>
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => startRename(i)}
                      title="Renomear"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      onClick={() => removeSheet(i)}
                      disabled={sheets.length <= 1}
                      title={sheets.length <= 1 ? "Precisa ter ao menos 1 aba" : "Excluir"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Dica: use “Renomear” para deixar o template mais organizado.
      </div>
    </div>
  );
}
