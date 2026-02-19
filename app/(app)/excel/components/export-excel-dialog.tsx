"use client"

import * as React from "react"
import { Download, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { useCreateExcelExportMutation, useExcelExportRequirementsQuery } from "@/app/modules/excel/excel.queries"
import type { ExcelExportRequirementParam, ExcelExportRequirementsResponse } from "@/app/modules/excel/excel.schema"

import { downloadBlobAsFile } from "../utils/download"
import { EntityCombobox } from "./ui/entity-combobox"

/**
 * ✅ ExportExcelDialog
 *
 * Esta UI é responsável por:
 * - Buscar requirements dinâmicos do backend (params + options)
 * - Permitir seleção de scope via combobox
 * - Gerar e baixar o .xlsx
 *
 * Importante (contrato do backend):
 * - O POST /excel-exports espera { templateId, scope: { fairId, ownerId, stallId } }
 */
type ParamKey = "fairId" | "ownerId" | "stallId"

function getParamLabelDefault(key: ParamKey) {
  switch (key) {
    case "fairId":
      return "Feira"
    case "ownerId":
      return "Expositor"
    case "stallId":
      return "Barraca"
    default:
      return key
  }
}

/**
 * ✅ Backend retorna options como Record<paramKey, items[]>
 * Ex.: options.fairId, options.ownerId...
 */
function getOptionsForKey(req: ExcelExportRequirementsResponse | undefined, key: ParamKey) {
  if (!req) return []
  return req.options?.[key] ?? []
}

function isRequiredFilled(param: ExcelExportRequirementParam, value: string) {
  if (!param.required) return true
  return !!value?.trim()
}

export function ExportExcelDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  templateId: string
  templateName: string
}) {
  const { open, onOpenChange, templateId, templateName } = props

  const exportMut = useCreateExcelExportMutation()
  const reqQuery = useExcelExportRequirementsQuery(open ? templateId : undefined)

  const [values, setValues] = React.useState<Record<ParamKey, string>>({
    fairId: "",
    ownerId: "",
    stallId: "",
  })

  // Reset ao abrir / mudar template
  React.useEffect(() => {
    if (!open) return
    setValues({ fairId: "", ownerId: "", stallId: "" })
  }, [open, templateId])

  const params = reqQuery.data?.params ?? []

  const requiredOk = React.useMemo(() => {
    if (params.length === 0) return true
    return params.every((p) => isRequiredFilled(p, values[p.key as ParamKey] ?? ""))
  }, [params, values])

  /**
   * ✅ MVP do backend exige fairId dentro de scope.
   * Mesmo que requirements venha vazio por algum motivo, não deixamos exportar sem fairId.
   */
  const fairIdOk = !!values.fairId.trim()

  const canExport =
    !!templateId &&
    requiredOk &&
    fairIdOk &&
    !exportMut.isPending &&
    !reqQuery.isFetching &&
    !reqQuery.isError

  async function handleExport() {
    const payload = {
      templateId,
      scope: {
        fairId: values.fairId.trim() || undefined,
        ownerId: values.ownerId.trim() || undefined,
        stallId: values.stallId.trim() || undefined,
      },
    }

    const blob = await exportMut.mutateAsync(payload)

    const safeName = (templateName || "relatorio").replace(/[^\w\s-]/g, "").trim()
    const fileName = `${safeName || "relatorio"}.xlsx`

    downloadBlobAsFile(blob, fileName)
    onOpenChange(false)
  }

  const headerSubtitle = React.useMemo(() => {
    if (reqQuery.isLoading) return "Analisando requisitos do template…"
    if (reqQuery.isError) return "Não foi possível carregar os requisitos."
    if ((reqQuery.data?.params?.length ?? 0) === 0) return "Nenhum parâmetro necessário."
    return "Preencha os campos necessários para gerar o arquivo."
  }, [reqQuery.isLoading, reqQuery.isError, reqQuery.data?.params?.length])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <span>Gerar Excel</span>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Dinâmico
                </Badge>
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Template */}
        <div className="rounded-2xl border bg-background p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">Template</div>
              <div className="truncate text-base font-semibold">{templateName}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {templateId.slice(0, 8)}…
              </Badge>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="rounded-2xl border bg-muted/10 p-4">
          {reqQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando requisitos…
            </div>
          ) : reqQuery.isError ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-destructive">Falha ao carregar requisitos</div>
              <p className="text-sm text-muted-foreground">
                Verifique a rota do backend e se o templateId é válido.
              </p>
            </div>
          ) : params.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Este template não exige parâmetros. (MVP: ainda exige Feira)
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Parâmetros</div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={requiredOk && fairIdOk ? "secondary" : "outline"}
                    className={cn(!(requiredOk && fairIdOk) && "text-muted-foreground")}
                  >
                    {requiredOk && fairIdOk ? "Pronto para gerar" : "Campos obrigatórios pendentes"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {params.map((p) => {
                  const key = p.key as ParamKey
                  const label = p.label || getParamLabelDefault(key)
                  const hint = p.hint
                  const options = getOptionsForKey(reqQuery.data, key)

                  const value = values[key] ?? ""
                  const missingRequired = p.required && !value.trim()

                  return (
                    <div key={p.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{label}</div>
                          {p.required ? (
                            <Badge variant="secondary" className="text-[11px]">
                              Obrigatório
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">
                              Opcional
                            </Badge>
                          )}
                        </div>

                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          {p.type}
                        </Badge>
                      </div>

                      <EntityCombobox
                        value={value}
                        onChange={(next) =>
                          setValues((prev) => ({
                            ...prev,
                            [key]: next ?? "",
                          }))
                        }
                        items={options.map((o) => ({
                          id: o.id,
                          label: o.label,
                          description: o.sublabel,
                          disabled: o.disabled,
                        }))}
                        placeholder={`Selecionar ${label.toLowerCase()}…`}
                        emptyText={`Nenhuma opção encontrada para ${label.toLowerCase()}.`}
                      />

                      <div className="min-h-[18px] text-xs">
                        {missingRequired ? (
                          <span className="text-destructive">Este campo é obrigatório.</span>
                        ) : key === "fairId" && !fairIdOk ? (
                          <span className="text-destructive">Selecione uma feira para gerar o Excel.</span>
                        ) : hint ? (
                          <span className="text-muted-foreground">{hint}</span>
                        ) : (
                          <span className="text-muted-foreground"> </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exportMut.isPending}>
            Cancelar
          </Button>

          <Button
            onClick={handleExport}
            disabled={!canExport}
            className="gap-2 bg-orange-600 text-white hover:bg-orange-600/90"
          >
            {exportMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar e baixar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
