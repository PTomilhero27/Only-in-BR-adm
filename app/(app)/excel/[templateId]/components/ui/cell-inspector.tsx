"use client"

/**
 * CellInspector
 *
 * Responsabilidade:
 * - Exibir e editar propriedades da ABA (nome + dataset base)
 * - Exibir e editar propriedades da CÉLULA selecionada (tipo, valor/bind, formato, negrito)
 * - Permitir limpar a célula rapidamente
 *
 * Decisões:
 * - UI em 2 blocos (ABA / CÉLULA) para ficar óbvio pro usuário
 * - Sem "header grandão": fica compacto e rápido
 * - Evita re-render custoso: sem computações pesadas aqui
 */

import * as React from "react"
import { Trash2, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import type {
  ExcelDataset,
  ExcelDatasetField,
  ExcelDatasetItem,
  ExcelTemplateCellInput,
  ExcelTemplateSheetInput,
} from "@/app/modules/excel/excel.schema"

type CellCoord = { row: number; col: number }

const formatOptions = ["TEXT", "INT", "MONEY_CENTS", "DATE", "DATETIME", "BOOL"] as const

export function CellInspector(props: {
  /** Aba ativa */
  sheet: ExcelTemplateSheetInput

  /** Catálogo de datasets (para escolher dataset base da aba) */
  datasets: ExcelDatasetItem[]

  /** Campos do dataset base (para binds) */
  fields: ExcelDatasetField[]
  fieldsLoading?: boolean

  /** Célula selecionada */
  selected: CellCoord
  cell: ExcelTemplateCellInput | null

  /** Atualiza propriedades da aba */
  onChangeSheet: (patch: Partial<ExcelTemplateSheetInput>) => void

  /** Atualiza propriedades da célula */
  onChangeCell: (patch: Partial<ExcelTemplateCellInput> & { value?: string; type?: "TEXT" | "BIND" }) => void

  /** Limpa (remove) a célula */
  onClearCell: () => void
}) {
  const { sheet, datasets, fields, fieldsLoading, selected, cell, onChangeSheet, onChangeCell, onClearCell } = props

  const cellType = cell?.type ?? "TEXT"
  const cellValue = cell?.value ?? ""
  const cellFormat = cell?.format ?? "TEXT"
  const cellBold = !!cell?.bold

  const hasCell = !!cell

  return (
    <div className="p-4">
      {/* Top bar: posição + status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">
            R{selected.row}C{selected.col}
          </div>

          {hasCell ? (
            <Badge className="bg-orange-500/15 text-orange-700 hover:bg-orange-500/15 dark:text-orange-200">
              {cellType}
            </Badge>
          ) : (
            <Badge variant="outline">vazia</Badge>
          )}

          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Info className="h-4 w-4" />
            <span>
              {fieldsLoading ? "Carregando campos…" : `${fields.length} campos disponíveis`}
            </span>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="h-9"
          onClick={onClearCell}
          disabled={!hasCell}
          title={!hasCell ? "Não há conteúdo para limpar" : "Limpar célula selecionada"}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Limpar célula
        </Button>
      </div>

      <Separator className="my-4" />

      {/* 2 blocos: Aba / Célula */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ABA */}
        <section className="rounded-2xl border bg-background p-4">
          <div className="mb-3 text-xs font-semibold text-muted-foreground">ABA</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium">Nome</div>
              <Input
                value={sheet.name}
                onChange={(e) => onChangeSheet({ name: e.target.value })}
                className="h-9"
                placeholder="Ex.: Relatório"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium">Dataset base</div>
              <Select value={sheet.dataset} onValueChange={(v) => onChangeSheet({ dataset: v as ExcelDataset })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((d) => (
                    <SelectItem key={d.dataset} value={d.dataset}>
                      {d.label ?? d.dataset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-1 text-[11px] text-muted-foreground">
                O dataset base define quais campos aparecem no “/” e no seletor de Bind.
              </div>
            </div>
          </div>
        </section>

        {/* CÉLULA */}
        <section className="rounded-2xl border bg-background p-4">
          <div className="mb-3 text-xs font-semibold text-muted-foreground">CÉLULA</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium">Tipo</div>
              <Select
                value={cellType}
                onValueChange={(v) => {
                  // Ao trocar o tipo, limpamos o value pra evitar lixo antigo
                  onChangeCell({ type: v as any, value: "" })
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Texto</SelectItem>
                  <SelectItem value="BIND">Bind</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium">Formato</div>
              <Select value={cellFormat} onValueChange={(v) => onChangeCell({ format: v as any })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor */}
            <div className={cn("space-y-1 sm:col-span-2")}>
              {cellType === "TEXT" ? (
                <>
                  <div className="text-xs font-medium">Texto</div>
                  <Input
                    value={cellValue}
                    placeholder="Digite o texto… (ex: Relatório da Feira)"
                    onChange={(e) => onChangeCell({ value: e.target.value })}
                    className="h-9"
                  />
                </>
              ) : (
                <>
                  <div className="text-xs font-medium">Campo (bind)</div>
                  <Select value={cellValue} onValueChange={(v) => onChangeCell({ value: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione um campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((f) => (
                        <SelectItem key={f.fieldKey} value={f.fieldKey}>
                          {f.label} ({f.fieldKey})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="text-[11px] text-muted-foreground">
                    No Excel exportado, isso vira o valor real do campo.
                  </div>
                </>
              )}
            </div>

            {/* Negrito */}
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox checked={cellBold} onCheckedChange={(v) => onChangeCell({ bold: Boolean(v) })} id="bold" />
              <label htmlFor="bold" className="text-sm">
                Negrito
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
