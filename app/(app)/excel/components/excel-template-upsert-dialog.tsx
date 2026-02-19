// src/modules/excel/components/excel-template-upsert-dialog.tsx
"use client"

import { useMemo, useState } from "react"
import { FileSpreadsheet } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ExcelTemplateScope, ExcelTemplateStatus } from "@/app/modules/excel/excel.schema"

/**
 * Dialog de criação/edição de Template Excel.
 *
 * Responsabilidade:
 * - Capturar metadados (name/status/scope).
 * - Estrutura do template fica no builder (/excel/:id).
 *
 * A11y:
 * - Radix exige DialogTitle e recomenda DialogDescription.
 * - Mantemos ambos com VisuallyHidden para preservar layout.
 */
export function ExcelTemplateUpsertDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "create" | "edit"
  initialValues: {
    name: string
    status: ExcelTemplateStatus
    scope?: ExcelTemplateScope
  }
  onSubmit: (input: {
    name: string
    status: ExcelTemplateStatus
    scope: ExcelTemplateScope
  }) => Promise<void>
  isSubmitting?: boolean
}) {
  const { open, onOpenChange, mode, initialValues, onSubmit, isSubmitting } = props

  const [name, setName] = useState(initialValues.name)
  const [status, setStatus] = useState<ExcelTemplateStatus>(initialValues.status)
  const [scope, setScope] = useState<ExcelTemplateScope>(initialValues.scope ?? "FAIR")

  const title = mode === "create" ? "Novo template" : "Editar template"
  const description = "Configure os metadados antes de montar o relatório."

  function scopeShort(s: ExcelTemplateScope) {
    switch (s) {
      case "FAIR":
        return "Feira"
      case "FAIR_OWNER":
        return "Feira + Expositor"
      case "FAIR_STALL":
        return "Feira + Barraca"
      case "OWNER":
        return "Expositor"
      case "STALL":
        return "Barraca"
      default:
        return s
    }
  }

  function scopeLong(s: ExcelTemplateScope) {
    switch (s) {
      case "FAIR":
        return "Gera Excel para uma feira."
      case "FAIR_OWNER":
        return "Gera Excel para um expositor dentro da feira."
      case "FAIR_STALL":
        return "Gera Excel para uma barraca dentro da feira."
      case "OWNER":
        return "Gera Excel a partir do expositor."
      case "STALL":
        return "Gera Excel a partir da barraca."
      default:
        return ""
    }
  }

  const scopeDescription = useMemo(() => scopeLong(scope), [scope])

  async function handleSubmit() {
    if (!name.trim()) return
    await onSubmit({ name: name.trim(), status, scope })
  }

  const canSubmit = !!name.trim() && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-8 space-y-8">
        {/* ✅ A11y: Radix precisa desses nós */}
        <VisuallyHidden.Root>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden.Root>
        <VisuallyHidden.Root>
          <DialogDescription>{description}</DialogDescription>
        </VisuallyHidden.Root>

        {/* Header visual custom */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 flex items-center justify-center rounded-xl border bg-muted/30">
            <FileSpreadsheet className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>

        {/* Nome */}
        <div className="space-y-2">
          <Label>Nome do template</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Relatório Financeiro"
          />
          <p className="text-xs text-muted-foreground">
            Nome exibido na listagem administrativa.
          </p>
        </div>

        {/* Status + Scope */}
        <div className="space-y-8">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>

            <div className="flex rounded-xl border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setStatus("ACTIVE")}
                className={[
                  "h-9 flex-1 rounded-lg text-sm font-medium transition",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30",
                  status === "ACTIVE"
                    ? "bg-background shadow-sm border border-primary/20 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Ativo
              </button>

              <button
                type="button"
                onClick={() => setStatus("INACTIVE")}
                className={[
                  "h-9 flex-1 rounded-lg text-sm font-medium transition",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30",
                  status === "INACTIVE"
                    ? "bg-background shadow-sm border border-primary/20 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Inativo
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Use <b>Inativo</b> para ocultar sem apagar.
            </p>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>Escopo (scope)</Label>

            <Select value={scope} onValueChange={(v) => setScope(v as ExcelTemplateScope)}>
              <SelectTrigger className="h-10 rounded-xl">
                {/* Mostra label curto no trigger */}
                <SelectValue>{scopeShort(scope)}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                {(["FAIR", "FAIR_OWNER", "FAIR_STALL", "OWNER", "STALL"] as ExcelTemplateScope[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{scopeShort(s)}</span>
                        <span className="text-xs text-muted-foreground">{scopeLong(s)}</span>
                      </div>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">{scopeDescription}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-1">
          <DialogClose asChild>
            <Button variant="outline" disabled={!!isSubmitting}>
              Cancelar
            </Button>
          </DialogClose>

          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
