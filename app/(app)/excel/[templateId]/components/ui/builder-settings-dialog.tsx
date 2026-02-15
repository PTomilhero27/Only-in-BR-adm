"use client"

/**
 * BuilderSettingsDialog (fix overflow)
 * - Modal com scroll interno (não estoura)
 * - Tabs e conteúdos com min-w-0 + overflow controlado
 */

import * as React from "react"
import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ExcelTemplateSheetInput } from "@/app/modules/excel/excel.schema"
import { SheetsTabs } from "./sheets-tabs"
import { SheetsList } from "./sheets-list"

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

export function BuilderSettingsDialog(props: {
  sheets: ExcelTemplateSheetInput[]
  activeIndex: number
  onChangeSheets: (nextSheets: ExcelTemplateSheetInput[], nextIndex: number) => void
  gridRows: number
  setGridRows: (n: number) => void
  gridCols: number
  setGridCols: (n: number) => void
}) {
  const { sheets, activeIndex, onChangeSheets, gridRows, setGridRows, gridCols, setGridCols } = props

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </Button>
      </DialogTrigger>

      {/* ✅ max-h + overflow-y-auto para não “estourar” */}
      <DialogContent className="max-w-[820px] max-h-[500px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações do template</DialogTitle>
        </DialogHeader>

        {/* ✅ min-w-0 evita overflow estranho dentro de flex/grid */}
        <div className="min-w-0">
          <Tabs defaultValue="abas" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="abas">Abas</TabsTrigger>
              <TabsTrigger value="grid">Grid</TabsTrigger>
            </TabsList>

<TabsContent value="abas" className="mt-4 space-y-3">
  <div className="text-sm text-muted-foreground">
    Crie, renomeie e remova abas do template.
  </div>

  <div className="rounded-2xl border bg-muted/10 p-3">
    <SheetsList
      sheets={sheets}
      activeIndex={activeIndex}
      onChange={(nextSheets, nextIndex) => onChangeSheets(nextSheets, nextIndex)}
    />
  </div>
</TabsContent>

            <TabsContent value="grid" className="mt-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Defina apenas o tamanho total do grid. Viewport fica padrão (7x7).
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Linhas (total)</Label>
                  <Input
                    type="number"
                    className="h-10"
                    value={gridRows}
                    onChange={(e) => setGridRows(clampInt(Number(e.target.value), 10, 500))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Colunas (total)</Label>
                  <Input
                    type="number"
                    className="h-10"
                    value={gridCols}
                    onChange={(e) => setGridCols(clampInt(Number(e.target.value), 5, 200))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/10 p-3 text-xs text-muted-foreground">
                Visualização padrão: <b>7 linhas</b> x <b>7 colunas</b>.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
