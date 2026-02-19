/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * ExcelTemplateBuilderSheet
 *
 * Regras:
 * - Backend NÃO aceita: mode/gridRows/gridCols/multiColumns
 * - MULTI é persistido como 1 "table" com columns
 * - SINGLE persiste cells/tables normalmente
 *
 * UX:
 * - mode padrão é derivado do dataset (excelDatasetMode)
 * - ao trocar dataset no settings, ajusta mode e estrutura
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

import {
  useExcelDatasetsQuery,
  useExcelDatasetFieldsQuery,
  useExcelTemplateQuery,
  useUpdateExcelTemplateMutation,
} from "@/app/modules/excel/excel.queries";

import type {
  ExcelDataset,
  ExcelDatasetField,
  ExcelDatasetItem,
  ExcelSheetMode,
  ExcelTemplateSheetInput,
  ExcelTemplateCellInput,
  ExcelTemplateMultiColumnInput,
  ExcelTemplateSheetApiInput,
  ExcelValueFormat,
  ExcelTemplateTableInput,
  ExcelTemplateTableColumnInput,
} from "@/app/modules/excel/excel.schema";

import { excelDatasetMode } from "@/app/modules/excel/excel.schema";

import { BuilderTopBar } from "./ui/builder-top-bar";
import { BuilderSettingsDialog } from "./ui/builder-settings-dialog";
import { ExcelGrid } from "./ui/excel-grid";
import { CellEditDialog } from "./ui/cell-edit-dialog";
import { MultiSheetGrid } from "./ui/multi/multi-sheet-grid";
import { MultiColumnEditDialog } from "./ui/multi/multi-column-edit-dialog";
import { SheetModeSwitchAlertDialog } from "./ui/multi/sheet-mode-switch-alert-dialog";

type CellCoord = { row: number; col: number }; // 1-based

function getCell(cells: ExcelTemplateCellInput[], rc: CellCoord) {
  return cells.find((c) => c.row === rc.row && c.col === rc.col) ?? null;
}

function upsertCell(
  cells: ExcelTemplateCellInput[],
  rc: CellCoord,
  patch: Partial<ExcelTemplateCellInput> & {
    type?: "TEXT" | "BIND";
    value?: string;
  },
) {
  const idx = cells.findIndex((c) => c.row === rc.row && c.col === rc.col);

  const next: ExcelTemplateCellInput = {
    row: rc.row,
    col: rc.col,
    type: patch.type ?? (idx >= 0 ? cells[idx].type : "TEXT"),
    value: patch.value ?? (idx >= 0 ? cells[idx].value : ""),
    format: patch.format ?? (idx >= 0 ? cells[idx].format : undefined),
    bold: patch.bold ?? (idx >= 0 ? cells[idx].bold : false),
  };

  // não persistir “célula vazia”
  const isEmpty = (next.value ?? "").trim() === "";
  if (isEmpty) {
    if (idx >= 0) {
      const copy = cells.slice();
      copy.splice(idx, 1);
      return copy;
    }
    return cells;
  }

  if (idx >= 0) {
    const copy = cells.slice();
    copy[idx] = next;
    return copy;
  }

  return [...cells, next];
}

function removeCell(cells: ExcelTemplateCellInput[], rc: CellCoord) {
  const idx = cells.findIndex((c) => c.row === rc.row && c.col === rc.col);
  if (idx < 0) return cells;
  const copy = cells.slice();
  copy.splice(idx, 1);
  return copy;
}

/** MULTI: cria colunas default */
function buildDefaultMultiColumns(count: number): ExcelTemplateMultiColumnInput[] {
  const n = Math.max(1, Math.min(50, count));
  return Array.from({ length: n }).map((_, i) => ({
    id: `col-${i + 1}`,
    header: "",
    fieldKey: "",
    format: undefined,
  }));
}

/** SINGLE: defaults coerentes (10x10), remove multiColumns */
function toSingleSheet(
  sheet: ExcelTemplateSheetInput,
  fromMode?: ExcelSheetMode,
): ExcelTemplateSheetInput {
  const comingFromMulti = fromMode === "MULTI";

  return {
    ...sheet,
    mode: "SINGLE",
    gridRows: comingFromMulti ? 10 : sheet.gridRows && sheet.gridRows > 0 ? sheet.gridRows : 10,
    gridCols: comingFromMulti ? 10 : sheet.gridCols && sheet.gridCols > 0 ? sheet.gridCols : 10,
    cells: sheet.cells ?? [],
    multiColumns: undefined,
  };
}

/** MULTI: 2 linhas fixas, trabalha com multiColumns, zera cells */
function toMultiSheet(sheet: ExcelTemplateSheetInput): ExcelTemplateSheetInput {
  const cols = sheet.multiColumns ?? buildDefaultMultiColumns(sheet.gridCols ?? 10);

  return {
    ...sheet,
    mode: "MULTI",
    gridRows: 2,
    gridCols: cols.length,
    multiColumns: cols,
    cells: [],
  };
}

/** MULTI: “tem dados” se alguma coluna tem header ou fieldKey */
function hasMeaningfulMultiData(sheet: ExcelTemplateSheetInput) {
  const cols: ExcelTemplateMultiColumnInput[] = ((sheet as any).multiColumns ?? []) as any;
  return cols.some((c) => (c.header ?? "").trim() !== "" || (c.fieldKey ?? "").trim() !== "");
}

/** ========= SERIALIZAÇÃO PARA API (remove campos UI) ========= */

type ApiCell = {
  row: number;
  col: number;
  type: "TEXT" | "BIND";
  value: string;
  format?: ExcelValueFormat | null;
  bold?: boolean;
};

type ApiTableColumn = ExcelTemplateTableColumnInput;
type ApiTable = ExcelTemplateTableInput;

function sanitizeCells(cells: any[] | undefined): ApiCell[] {
  return (cells ?? []).map((c) => ({
    row: c.row,
    col: c.col,
    type: c.type,
    value: c.value,
    format: c.format ?? undefined,
    bold: c.bold ?? undefined,
  }));
}

function sanitizeTables(tables: any[] | undefined): ExcelTemplateTableInput[] {
  return (tables ?? []).map((t) => ({
    anchorRow: t.anchorRow,
    anchorCol: t.anchorCol,
    dataset: t.dataset,
    includeHeader: t.includeHeader ?? undefined,
    columns: (t.columns ?? []).map((col: any) => ({
      order: col.order,
      header: col.header,
      fieldKey: col.fieldKey,
      format: col.format ?? undefined,
      width: col.width ?? undefined,
    })),
  }));
}

/**
 * ✅ MULTI vira 1 tabela (anchor 1,1)
 * - columns: header + fieldKey + format
 * - filtra colunas sem fieldKey (não salva bind vazio)
 */
function serializeSheetsForApi(uiSheets: ExcelTemplateSheetInput[]): ExcelTemplateSheetApiInput[] {
  return uiSheets.map((s): ExcelTemplateSheetApiInput => {
    const datasetModeWanted = excelDatasetMode(s.dataset);
    const uiMode: ExcelSheetMode = (s.mode ?? datasetModeWanted) as ExcelSheetMode;

    if (uiMode === "SINGLE") {
      return {
        name: s.name,
        order: s.order ?? 0,
        dataset: s.dataset,
        cells: sanitizeCells(s.cells as any),
        tables: sanitizeTables(s.tables as any),
      };
    }

    const cols: ExcelTemplateMultiColumnInput[] = (s as any).multiColumns ?? [];

    const validCols: ApiTableColumn[] = cols
      .map((c, idx) => ({
        order: idx,
        header: (c.header ?? "").trim() || `Coluna ${idx + 1}`,
        fieldKey: (c.fieldKey ?? "").trim(),
        format: c.format ?? undefined,
        width: undefined,
      }))
      .filter((c) => c.fieldKey);

    const tables: ApiTable[] = validCols.length
      ? [
          {
            anchorRow: 1,
            anchorCol: 1,
            dataset: s.dataset,
            includeHeader: true,
            columns: validCols,
          },
        ]
      : [];

    return {
      name: s.name,
      order: s.order ?? 0,
      dataset: s.dataset,
      cells: [],
      tables,
    };
  });
}

export function ExcelTemplateBuilderSheet({ templateId }: { templateId: string }) {
  const router = useRouter();

  const templateQ = useExcelTemplateQuery(templateId);
  const datasetsQ = useExcelDatasetsQuery();
  const updateMut = useUpdateExcelTemplateMutation();

  // ✅ template vem direto
  const template = templateQ.data;

  const [sheets, setSheets] = React.useState<ExcelTemplateSheetInput[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const [selected, setSelected] = React.useState<CellCoord>({ row: 1, col: 1 });

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorCoord, setEditorCoord] = React.useState<CellCoord>({ row: 1, col: 1 });

  const [multiPickOpen, setMultiPickOpen] = React.useState(false);
  const [multiPickColIndex, setMultiPickColIndex] = React.useState<number | null>(null);

  const [modeConfirmOpen, setModeConfirmOpen] = React.useState(false);
  const [pendingMode, setPendingMode] = React.useState<ExcelSheetMode | null>(null);
  const [modeConfirmText, setModeConfirmText] = React.useState("");

  React.useEffect(() => {
    if (!template) return;

    const next: ExcelTemplateSheetInput[] = template.sheets
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => {
        const wanted = excelDatasetMode(s.dataset);
        const mode = ((s as any).mode ?? wanted) as ExcelSheetMode;

        const base: ExcelTemplateSheetInput = {
          name: s.name,
          order: s.order,
          dataset: s.dataset,

          mode,
          gridRows: (s as any).gridRows ?? 10,
          gridCols: (s as any).gridCols ?? 10,

          cells: (s.cells ?? []).map((c) => ({
            row: c.row,
            col: c.col,
            type: c.type,
            value: c.value,
            format: c.format ?? undefined,
            bold: c.bold ?? false,
          })),

          // backend atual só entende tables
          tables: (s.tables ?? []) as any,

          // UI MULTI: se backend não tiver multiColumns, cria baseado no tables[0]
          multiColumns: (() => {
            if (mode !== "MULTI") return undefined;

            const t0 = (s.tables ?? [])[0] as any | undefined;
            const colsFromTable = Array.isArray(t0?.columns)
              ? (t0.columns as any[]).map((col, idx) => ({
                  id: `col-${idx + 1}`,
                  header: col.header ?? "",
                  fieldKey: col.fieldKey ?? "",
                  format: col.format ?? undefined,
                }))
              : [];

            const initialCols = colsFromTable.length ? colsFromTable : buildDefaultMultiColumns(10);
            return initialCols;
          })(),
        };

        return mode === "MULTI" ? toMultiSheet(base) : toSingleSheet(base, "SINGLE");
      });

    setSheets(next);
    setActiveIndex(0);
    setSelected({ row: 1, col: 1 });
    setEditorOpen(false);
    setMultiPickOpen(false);
    setMultiPickColIndex(null);
    setModeConfirmOpen(false);
    setPendingMode(null);
    setModeConfirmText("");
  }, [template]);

  const activeSheet = sheets[activeIndex];
  const sheetMode = ((activeSheet?.mode ?? excelDatasetMode(activeSheet?.dataset as any) ?? "SINGLE") as ExcelSheetMode) ?? "SINGLE";
  const activeDataset = activeSheet?.dataset as ExcelDataset | undefined;

  const fieldsQ = useExcelDatasetFieldsQuery(activeDataset);
  const datasets: ExcelDatasetItem[] = datasetsQ.data ?? [];
  const fields: ExcelDatasetField[] = React.useMemo(() => fieldsQ.data ?? [], [fieldsQ.data]);

  const isLoading = templateQ.isLoading || datasetsQ.isLoading;

  function updateActiveSheet(next: ExcelTemplateSheetInput) {
    setSheets((prev) => {
      const copy = prev.slice();
      copy[activeIndex] = next;
      return copy;
    });
  }

  function openSingleEditor(rc: CellCoord) {
    setSelected(rc);
    setEditorCoord(rc);
    setEditorOpen(true);
  }

  function onPatchCell(
    rc: CellCoord,
    patch: Partial<ExcelTemplateCellInput> & { type?: "TEXT" | "BIND"; value?: string },
  ) {
    if (!activeSheet) return;
    const nextCells = upsertCell(activeSheet.cells ?? [], rc, patch);
    updateActiveSheet({ ...activeSheet, cells: nextCells });
  }

  async function handleSave() {
    try {
      const apiSheets = serializeSheetsForApi(sheets);
      await updateMut.mutateAsync({ templateId, input: { sheets: apiSheets } });
      toast.success({ title: "Template salvo com sucesso." });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar template.");
    }
  }

  const editorCell = React.useMemo(() => {
    if (!activeSheet) return null;
    return getCell(activeSheet.cells ?? [], editorCoord);
  }, [activeSheet, editorCoord]);

  const bindOptions = React.useMemo(() => {
    return (fields ?? []).map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label ?? f.fieldKey,
      format: (f as any).format ?? undefined,
      group: (f as any).group ?? (f as any).section ?? undefined,
      hint: (f as any).hint ?? undefined,
    }));
  }, [fields]);

  const fieldLabelByKey = React.useMemo(() => {
    const m = new Map<string, { label: string; format?: any }>();
    for (const f of fields ?? []) {
      m.set(f.fieldKey, { label: f.label ?? f.fieldKey, format: (f as any).format ?? undefined });
    }
    return m;
  }, [fields]);

  function requestSheetMode(nextMode: ExcelSheetMode) {
    if (!activeSheet) return;
    const currentMode = ((activeSheet.mode ?? excelDatasetMode(activeSheet.dataset)) as ExcelSheetMode) ?? "SINGLE";
    if (currentMode === nextMode) return;

    const hasSingleData = (activeSheet.cells?.length ?? 0) > 0;
    const hasMultiData = hasMeaningfulMultiData(activeSheet);

    const willLose =
      (currentMode === "SINGLE" && hasSingleData) || (currentMode === "MULTI" && hasMultiData);

    if (!willLose) {
      applySheetMode(nextMode);
      return;
    }

    const labelFrom = currentMode === "SINGLE" ? "Dados únicos" : "Multi dados";
    const labelTo = nextMode === "SINGLE" ? "Dados únicos" : "Multi dados";

    setPendingMode(nextMode);
    setModeConfirmText(
      `Trocar de "${labelFrom}" para "${labelTo}" vai apagar a configuração atual de "${labelFrom}".`,
    );
    setModeConfirmOpen(true);
  }

  function applySheetMode(nextMode: ExcelSheetMode) {
    if (!activeSheet) return;
    const currentMode = ((activeSheet.mode ?? excelDatasetMode(activeSheet.dataset)) as ExcelSheetMode) ?? "SINGLE";
    if (currentMode === nextMode) return;

    setSelected({ row: 1, col: 1 });
    setEditorOpen(false);
    setMultiPickOpen(false);
    setMultiPickColIndex(null);

    if (nextMode === "SINGLE") {
      updateActiveSheet(toSingleSheet({ ...activeSheet, cells: [], tables: activeSheet.tables ?? [] }, currentMode));
      return;
    }

    updateActiveSheet(toMultiSheet({ ...activeSheet, multiColumns: undefined, cells: [], tables: [] }));
  }

  const gridKey = React.useMemo(() => {
    if (!activeSheet) return "grid:empty";
    if (sheetMode === "SINGLE") {
      return `single:${activeSheet.name}:${activeSheet.gridRows ?? 10}x${activeSheet.gridCols ?? 10}`;
    }
    return `multi:${activeSheet.name}:${(activeSheet as any).multiColumns?.length ?? 10}`;
  }, [activeSheet, sheetMode]);

  // MULTI handlers
  function onMultiCellClick(rc: CellCoord) {
    const colIndex = rc.col - 1;
    setSelected(rc);
    setMultiPickColIndex(colIndex);
    setMultiPickOpen(true);
  }

  function updateMultiColumn(colIndex: number, patch: Partial<ExcelTemplateMultiColumnInput>) {
    if (!activeSheet) return;
    const cols: ExcelTemplateMultiColumnInput[] = (activeSheet as any).multiColumns ?? [];
    const copy = cols.slice();

    const current =
      copy[colIndex] ??
      ({
        id: `col-${colIndex + 1}`,
        header: "",
        fieldKey: "",
      } as ExcelTemplateMultiColumnInput);

    copy[colIndex] = { ...current, ...patch };

    updateActiveSheet({
      ...activeSheet,
      mode: "MULTI",
      gridRows: 2,
      gridCols: copy.length,
      multiColumns: copy as any,
      cells: [],
      tables: [],
    });
  }

  function setMultiColumnsCount(nextCount: number) {
    if (!activeSheet) return;
    const count = Math.max(1, Math.min(50, nextCount));

    const prevCols: ExcelTemplateMultiColumnInput[] = (activeSheet as any).multiColumns ?? [];
    let nextCols = prevCols.slice();

    if (nextCols.length < count) {
      nextCols = nextCols.concat(
        buildDefaultMultiColumns(count - nextCols.length).map((c, i) => ({
          ...c,
          id: `col-${nextCols.length + i + 1}`,
        })),
      );
    } else if (nextCols.length > count) {
      nextCols = nextCols.slice(0, count);
    }

    updateActiveSheet({
      ...activeSheet,
      mode: "MULTI",
      gridRows: 2,
      gridCols: nextCols.length,
      multiColumns: nextCols as any,
      cells: [],
      tables: [],
    });
  }

  // SINGLE handlers
  function setSingleGridSize(nextRows: number, nextCols: number) {
    if (!activeSheet) return;
    const rows = Math.max(1, Math.min(200, nextRows));
    const cols = Math.max(1, Math.min(100, nextCols));

    updateActiveSheet({
      ...activeSheet,
      mode: "SINGLE",
      gridRows: rows,
      gridCols: cols,
      cells: activeSheet.cells ?? [],
      tables: activeSheet.tables ?? [],
      multiColumns: undefined,
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (templateQ.isError) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Não foi possível carregar o template.
      </div>
    );
  }

  if (!template || !activeSheet) {
    return <div className="p-6 text-sm text-muted-foreground">Template não encontrado.</div>;
  }

  const singleRows = sheetMode === "SINGLE" ? (activeSheet.gridRows ?? 10) : 10;
  const singleCols = sheetMode === "SINGLE" ? (activeSheet.gridCols ?? 10) : 10;

  const multiCols =
    ((activeSheet as any).multiColumns?.length ?? activeSheet.gridCols ?? 10) as number;

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
              setSheets(nextSheets);
              setActiveIndex(nextIndex);
              setSelected({ row: 1, col: 1 });
              setEditorOpen(false);
              setMultiPickOpen(false);
              setMultiPickColIndex(null);
            }}
            datasets={datasets}
            activeDataset={activeDataset}
            onChangeActiveDataset={(next) => {
              if (!activeSheet) return;

              const nextWantedMode = excelDatasetMode(next);

              // muda dataset + alinha modo conforme dataset (SINGLE/MULTI)
              const nextSheet = { ...activeSheet, dataset: next };

              updateActiveSheet(
                nextWantedMode === "MULTI"
                  ? toMultiSheet({ ...nextSheet, multiColumns: (nextSheet as any).multiColumns, cells: [], tables: [] })
                  : toSingleSheet({ ...nextSheet, cells: nextSheet.cells ?? [], tables: nextSheet.tables ?? [] }, sheetMode),
              );

              // reset seleção/edição
              setSelected({ row: 1, col: 1 });
              setEditorOpen(false);
              setMultiPickOpen(false);
              setMultiPickColIndex(null);
            }}
            sheetMode={sheetMode}
            onRequestModeChange={requestSheetMode}
            singleRows={singleRows}
            singleCols={singleCols}
            onChangeSingleSize={setSingleGridSize}
            multiCols={multiCols}
            onChangeMultiCols={setMultiColumnsCount}
          />
        }
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-4">
        <div className="rounded-2xl border bg-muted/10 shadow-sm">
          <div className="p-3">
            {sheetMode === "SINGLE" ? (
              <ExcelGrid
                key={gridKey}
                sheet={activeSheet}
                selected={selected}
                onSelect={(rc) => setSelected(rc)}
                onCellClick={(rc) => openSingleEditor(rc)}
                totalRows={singleRows}
                totalCols={singleCols}
                fieldLabelByKey={fieldLabelByKey}
                cellWidth={180}
                cellHeight={44}
                maxHeightOffsetPx={260}
              />
            ) : (
              <MultiSheetGrid
                key={gridKey}
                sheet={activeSheet}
                selected={selected}
                onSelect={(rc) => setSelected(rc)}
                onCellClick={(rc) => onMultiCellClick(rc)}
                fieldLabelByKey={fieldLabelByKey}
              />
            )}
          </div>
        </div>
      </div>

      {/* SINGLE editor */}
      <CellEditDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        coord={editorCoord}
        cell={editorCell}
        bindOptions={bindOptions}
        onSave={(patch) => onPatchCell(editorCoord, patch)}
        onClear={() => {
          if (!activeSheet) return;
          const nextCells = removeCell(activeSheet.cells ?? [], editorCoord);
          updateActiveSheet({ ...activeSheet, cells: nextCells });
        }}
      />

      {/* MULTI editor */}
      <MultiColumnEditDialog
        open={multiPickOpen}
        onOpenChange={(v) => {
          setMultiPickOpen(v);
          if (!v) setMultiPickColIndex(null);
        }}
        colIndex={multiPickColIndex}
        columns={(activeSheet as any).multiColumns ?? []}
        bindOptions={bindOptions}
        onSave={(index, patch) => updateMultiColumn(index, patch)}
      />

      {/* Confirm mode switch */}
      <SheetModeSwitchAlertDialog
        open={modeConfirmOpen}
        onOpenChange={(v) => {
          setModeConfirmOpen(v);
          if (!v) setPendingMode(null);
        }}
        description={modeConfirmText}
        onConfirm={() => {
          if (!pendingMode) return;
          applySheetMode(pendingMode);
          setModeConfirmOpen(false);
          setPendingMode(null);
        }}
      />
    </div>
  );
}
