"use client"

/**
 * CellEditDialog
 *
 * Responsabilidade:
 * - Modal para editar uma célula (Texto ou Bind)
 * - No modo Bind: input pesquisável (autocomplete) com filtro ao digitar
 * - No modo Texto: ao digitar "/" abre a busca de campos e ao selecionar vira Bind
 *
 * Decisão:
 * - Sem Popover/anchor (evita bugs e lentidão)
 * - A lista fica inline abaixo do input e usa filtro local (muito rápido)
 */

import * as React from "react"
import { X, Search, Hash, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { ExcelTemplateCellInput } from "@/app/modules/excel/excel.schema"

type CellCoord = { row: number; col: number } // 1-based

export type BindOption = {
  fieldKey: string
  label: string
  format?: "TEXT" | "INT" | "MONEY_CENTS" | "DATE" | "DATETIME" | "BOOL"
}

const formatOptions = ["TEXT", "INT", "MONEY_CENTS", "DATE", "DATETIME", "BOOL"] as const

function cellTitle(rc: CellCoord) {
  return `R${rc.row}C${rc.col}`
}

function normalize(str: string) {
  return (str ?? "").trim().toLowerCase()
}

export function CellEditDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void

  coord: CellCoord

  /** célula atual (pode ser null => vazia) */
  cell: ExcelTemplateCellInput | null

  /** opções de bind disponíveis no dataset da aba */
  bindOptions: BindOption[]
  bindLoading?: boolean

  /** salvar alterações na célula */
  onSave: (next: ExcelTemplateCellInput) => void

  /** limpar célula (remove) */
  onClear: () => void
}) {
  const { open, onOpenChange, coord, cell, bindOptions, bindLoading, onSave, onClear } = props

  // ---------------------------
  // Estado local do modal
  // ---------------------------
  const initialType = (cell?.type ?? "TEXT") as "TEXT" | "BIND"

  const [tab, setTab] = React.useState<"TEXT" | "BIND">(initialType)
  const [textValue, setTextValue] = React.useState(cell?.type === "TEXT" ? (cell.value ?? "") : "")
  const [bindValue, setBindValue] = React.useState(cell?.type === "BIND" ? (cell.value ?? "") : "")
  const [format, setFormat] = React.useState<(typeof formatOptions)[number]>((cell?.format as any) ?? "TEXT")
  const [bold, setBold] = React.useState<boolean>(!!cell?.bold)

  // Busca do bind
  const [bindQuery, setBindQuery] = React.useState("")
  const [bindOpenList, setBindOpenList] = React.useState(false)
  const bindInputRef = React.useRef<HTMLInputElement | null>(null)
  const textInputRef = React.useRef<HTMLInputElement | null>(null)

  // Reset ao abrir/trocar célula
  React.useEffect(() => {
    if (!open) return

    const nextType = (cell?.type ?? "TEXT") as "TEXT" | "BIND"
    setTab(nextType)

    setTextValue(cell?.type === "TEXT" ? (cell.value ?? "") : "")
    setBindValue(cell?.type === "BIND" ? (cell.value ?? "") : "")
    setFormat(((cell?.format as any) ?? "TEXT") as any)
    setBold(!!cell?.bold)

    setBindQuery("")
    setBindOpenList(false)

    // foco inicial
    const t = setTimeout(() => {
      if (nextType === "BIND") bindInputRef.current?.focus()
      else textInputRef.current?.focus()
    }, 30)
    return () => clearTimeout(t)
  }, [open, coord.row, coord.col, cell])

  // ---------------------------
  // Filtro local (rápido)
  // ---------------------------
  const filtered = React.useMemo(() => {
    const q = normalize(bindQuery)
    if (!q) return bindOptions
    return bindOptions.filter((o) => {
      const hay = `${o.label} ${o.fieldKey}`.toLowerCase()
      return hay.includes(q)
    })
  }, [bindOptions, bindQuery])

  const selectedBind = React.useMemo(() => {
    return bindOptions.find((o) => o.fieldKey === bindValue) ?? null
  }, [bindOptions, bindValue])

  // ---------------------------
  // Helpers
  // ---------------------------
  function commitSave() {
    const next: ExcelTemplateCellInput = {
      row: coord.row,
      col: coord.col,
      type: tab,
      value: tab === "TEXT" ? textValue : bindValue,
      format: format as any,
      bold,
    }

    // Se ficou vazio, não salva (deixa o usuário usar “Limpar célula”)
    const v = (next.value ?? "").trim()
    if (!v) {
      onOpenChange(false)
      return
    }

    onSave(next)
    onOpenChange(false)
  }

  function pickBind(opt: BindOption) {
    setBindValue(opt.fieldKey)
    // se o campo tem format sugerido e o user ainda tá no default, podemos ajudar
    if (opt.format) setFormat(opt.format)
    setBindOpenList(false)
  }

  // Texto: detectar "/" para abrir bind
  function onTextChange(v: string) {
    // Se o usuário digitou "/" como gatilho
    if (v.endsWith("/")) {
      setTab("BIND")
      setBindQuery("")
      setBindOpenList(true)
      // limpa o "/" do texto
      const cleaned = v.slice(0, -1)
      setTextValue(cleaned)

      // foco no input de bind
      setTimeout(() => bindInputRef.current?.focus(), 20)
      return
    }

    setTextValue(v)
  }

  // Bind input: Enter escolhe o 1º resultado
  function onBindKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setBindOpenList(false)
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      if (filtered.length > 0) pickBind(filtered[0])
      return
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">Editar célula</DialogTitle>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{cellTitle(coord)}</Badge>
                <span>•</span>
                <span>
                  Dica: no modo <b>Texto</b>, digite <b>/</b> para buscar um campo e transformar em <b>Bind</b>.
                </span>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Fechar">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <Separator />

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="TEXT">Texto</TabsTrigger>
            <TabsTrigger value="BIND">Bind</TabsTrigger>
          </TabsList>

          {/* ------------------- TEXT ------------------- */}
          <TabsContent value="TEXT" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Texto</Label>
              <Input
                ref={textInputRef}
                value={textValue}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder='Digite o texto… (ou "/" para inserir bind)'
              />
              <div className="text-xs text-muted-foreground">
                Ao exportar, esse texto vai para a célula exatamente como você escreveu.
              </div>
            </div>
          </TabsContent>

          {/* ------------------- BIND ------------------- */}
          <TabsContent value="BIND" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Campo (Bind)</Label>

              {/* Input pesquisável */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                <Input
                  ref={bindInputRef}
                  value={bindQuery}
                  onChange={(e) => {
                    setBindQuery(e.target.value)
                    setBindOpenList(true)
                  }}
                  onFocus={() => setBindOpenList(true)}
                  onKeyDown={onBindKeyDown}
                  placeholder={bindLoading ? "Carregando campos..." : "Digite para buscar (ex: nome, email, total)"}
                  className="pl-9"
                  disabled={bindLoading}
                />

                {/* Lista filtrada (dropdown inline) */}
                {bindOpenList && !bindLoading ? (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-md">
                    <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                      <div className="text-xs text-muted-foreground">
                        Enter seleciona o 1º • Clique para escolher
                      </div>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setBindOpenList(false)}
                      >
                        fechar
                      </button>
                    </div>

                    <ScrollArea className="max-h-[260px]">
                      <div className="p-1">
                        {filtered.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Nenhum campo encontrado.
                          </div>
                        ) : (
                          filtered.map((opt) => {
                            const active = opt.fieldKey === bindValue
                            return (
                              <button
                                key={opt.fieldKey}
                                type="button"
                                onClick={() => pickBind(opt)}
                                className={cn(
                                  "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left",
                                  "hover:bg-muted/40",
                                  active && "bg-orange-500/10",
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <div className="truncate text-sm font-medium">{opt.label}</div>
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">{opt.fieldKey}</div>
                                </div>

                                {opt.format ? (
                                  <Badge variant="outline" className="mt-0.5 text-[11px]">
                                    {opt.format}
                                  </Badge>
                                ) : null}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                ) : null}
              </div>

              {/* Campo selecionado */}
              <div className="rounded-xl border bg-muted/10 p-3">
                <div className="text-xs text-muted-foreground">Selecionado</div>
                {selectedBind ? (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{selectedBind.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{selectedBind.fieldKey}</div>
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      {format}
                    </Badge>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">Nenhum campo selecionado ainda.</div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Isso será preenchido com o valor real quando exportar o Excel.
                Exibição no grid: <code>{"{{fieldKey}}"}</code>.
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Formato + bold (comum aos dois modos) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger>
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

          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={bold} onCheckedChange={(v) => setBold(Boolean(v))} id="bold" />
              <Label htmlFor="bold" className="cursor-pointer">
                Negrito
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              onClear()
              onOpenChange(false)
            }}
            className="sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar célula
          </Button>

          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            <Button
              onClick={commitSave}
              className="bg-orange-500 text-white hover:bg-orange-600"
              disabled={tab === "BIND" ? !bindValue : !textValue.trim()}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
