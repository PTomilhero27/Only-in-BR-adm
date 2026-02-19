"use client";

/**
 * BuilderSettingsDialog
 *
 * - Ajusta abas
 * - Ajusta dataset da aba ativa (filtrado por modo SINGLE/MULTI)
 * - Ajusta modo da aba e grid conforme modo
 */

import * as React from "react";
import { Settings, Database, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  ExcelDataset,
  ExcelDatasetItem,
  ExcelSheetMode,
  ExcelTemplateSheetInput,
} from "@/app/modules/excel/excel.schema";

import { SheetsList } from "./sheets-list";
import { SheetModeToggle } from "./sheet-mode-toggle";

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/**
 * ✅ Regra simples: dataset MULTI = termina com _LIST
 * (basta pro seu enum atual)
 */
function isMultiDataset(ds: ExcelDataset) {
  return String(ds).endsWith("_LIST");
}

function filterDatasetsByMode(
  datasets: ExcelDatasetItem[],
  mode: ExcelSheetMode,
) {
  return datasets.filter((d) => {
    const multi = isMultiDataset(d.dataset as ExcelDataset);
    return mode === "MULTI" ? multi : !multi;
  });
}

function pickDefaultDataset(
  datasets: ExcelDatasetItem[],
  mode: ExcelSheetMode,
): ExcelDataset | undefined {
  // defaults “bons”
  const preferredSingle: ExcelDataset[] = ["FAIR_INFO", "FAIR_SUMMARY"] as any;
  const preferredMulti: ExcelDataset[] = ["FAIR_EXHIBITORS_LIST"] as any;

  const list = filterDatasetsByMode(datasets, mode);
  if (list.length === 0) return undefined;

  const preferred = mode === "MULTI" ? preferredMulti : preferredSingle;
  const foundPreferred = preferred.find((p) =>
    list.some((d) => d.dataset === p),
  );
  return (foundPreferred ?? list[0]?.dataset) as ExcelDataset;
}

export function BuilderSettingsDialog(props: {
  // Abas
  sheets: ExcelTemplateSheetInput[];
  activeIndex: number;
  onChangeSheets: (
    nextSheets: ExcelTemplateSheetInput[],
    nextIndex: number,
  ) => void;

  // Dataset (aba ativa)
  datasets: ExcelDatasetItem[];
  activeDataset: ExcelDataset | undefined;
  onChangeActiveDataset: (dataset: ExcelDataset) => void;

  // Modo + Grid (controlados pelo pai)
  sheetMode: ExcelSheetMode;
  onRequestModeChange: (mode: ExcelSheetMode) => void;

  // SINGLE
  singleRows: number;
  singleCols: number;
  onChangeSingleSize: (rows: number, cols: number) => void;

  // MULTI
  multiCols: number;
  onChangeMultiCols: (cols: number) => void;
}) {
  const {
    sheets,
    activeIndex,
    onChangeSheets,

    datasets,
    activeDataset,
    onChangeActiveDataset,

    sheetMode,
    onRequestModeChange,

    singleRows,
    singleCols,
    onChangeSingleSize,

    multiCols,
    onChangeMultiCols,
  } = props;

  const activeSheetName = sheets?.[activeIndex]?.name ?? "Aba";

  const filteredDatasets = React.useMemo(() => {
    return filterDatasetsByMode(datasets ?? [], sheetMode);
  }, [datasets, sheetMode]);

  // ✅ se o dataset atual não combina com o modo, troca automaticamente
  React.useEffect(() => {
    if (!datasets?.length) return;
    if (!activeDataset) {
      const def = pickDefaultDataset(datasets, sheetMode);
      if (def) onChangeActiveDataset(def);
      return;
    }

    const activeIsMulti = isMultiDataset(activeDataset);
    const modeIsMulti = sheetMode === "MULTI";

    if (activeIsMulti !== modeIsMulti) {
      const def = pickDefaultDataset(datasets, sheetMode);
      if (def) onChangeActiveDataset(def);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasets, sheetMode]);

  const datasetLabel = React.useMemo(() => {
    const found = (datasets ?? []).find((d) => d.dataset === activeDataset);
    return found?.label ?? (activeDataset ? String(activeDataset) : "");
  }, [datasets, activeDataset]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[920px] max-h-[560px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Ajuste abas, dataset e grid do template. (Aba ativa:{" "}
            <b>{activeSheetName}</b>)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="abas" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="abas">Abas</TabsTrigger>
            <TabsTrigger value="grid">Grid</TabsTrigger>
          </TabsList>

          {/* ====== ABAS ====== */}
          <TabsContent value="abas" className="mt-4 space-y-3">
            <div className="rounded-2xl border bg-background p-3">
              <SheetsList
                sheets={sheets}
                activeIndex={activeIndex}
                onChange={(nextSheets, nextIndex) =>
                  onChangeSheets(nextSheets, nextIndex)
                }
              />
            </div>
          </TabsContent>

          {/* ====== GRID + DATASET + MODO ====== */}
          <TabsContent value="grid" className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              Configure o <b>dataset</b> e o <b>modo</b> da aba.
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {/* Dataset */}
              <div className="rounded-2xl border bg-background p-4">
                <div className="items-start gap-3">
                  <div className="flex gap-3 items-center bg-muted/30">
                    <Database className="h-4 w-4" />

                    <div className="text-sm font-semibold">Dataset da aba</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mt-3 space-y-2">
                      <Select
                        value={activeDataset ?? ""}
                        onValueChange={(v) =>
                          onChangeActiveDataset(v as ExcelDataset)
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione um dataset" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDatasets.map((d) => (
                            <SelectItem
                              key={String(d.dataset)}
                              value={d.dataset}
                            >
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modo */}
              <div className="rounded-2xl border bg-background p-4">
                <div className="items-start gap-3">
                  <div className="flex gap-3 items-center bg-muted/30">
                    <LayoutGrid className="h-4 w-4" />
                    <div className="text-sm font-semibold">Modo da aba</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mt-3">
                      <SheetModeToggle
                        value={sheetMode}
                        onChange={onRequestModeChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Grid settings */}
            {sheetMode === "SINGLE" ? (
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-sm font-semibold">Grid (Dados únicos)</div>

                <div className="mt-3 grid grid-cols-2 gap-3 md:max-w-[420px]">
                  <div className="space-y-1">
                    <Label className="text-xs">Linhas</Label>
                    <Input
                      type="number"
                      className="h-10"
                      value={singleRows}
                      onChange={(e) =>
                        onChangeSingleSize(
                          clampInt(Number(e.target.value), 1, 200),
                          singleCols,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Colunas</Label>
                    <Input
                      type="number"
                      className="h-10"
                      value={singleCols}
                      onChange={(e) =>
                        onChangeSingleSize(
                          singleRows,
                          clampInt(Number(e.target.value), 1, 100),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                  SINGLE é livre: textos e binds em qualquer célula.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-sm font-semibold">Grid (Multi dados)</div>

                <div className="mt-3 grid grid-cols-2 gap-3 md:max-w-[420px]">
                  <div className="space-y-1">
                    <Label className="text-xs">Colunas</Label>
                    <Input
                      type="number"
                      className="h-10"
                      value={multiCols}
                      onChange={(e) =>
                        onChangeMultiCols(
                          clampInt(Number(e.target.value), 1, 50),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Linhas</Label>
                    <Input
                      type="text"
                      className="h-10"
                      value="2 (fixas)"
                      disabled
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                  MULTI é ideal para listas: você configura colunas e o export
                  gera uma linha por item.
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
