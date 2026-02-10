// src/modules/excel/components/excel-template-upsert-dialog.tsx
"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExcelTemplateStatus } from "@/app/modules/excel/excel.schema"


/**
 * Dialog de criação/edição de template.
 * Responsabilidade:
 * - Capturar apenas metadados (name/status) de forma rápida
 * - Evitar UX pesada no MVP
 *
 * Decisão:
 * - A estrutura (sheets) é editada no builder (/excel/:id).
 */
export function ExcelTemplateUpsertDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "create" | "edit"
  initialValues: { name: string; status: ExcelTemplateStatus }
  onSubmit: (input: { name: string; status: ExcelTemplateStatus }) => Promise<void>
  isSubmitting?: boolean
}) {
  const { open, onOpenChange, mode, initialValues, onSubmit, isSubmitting } = props

  const [name, setName] = useState(initialValues.name)
  const [status, setStatus] = useState<ExcelTemplateStatus>(initialValues.status)

  useEffect(() => {
    if (!open) return
    setName(initialValues.name)
    setStatus(initialValues.status)
  }, [open, initialValues.name, initialValues.status])

  async function handleSubmit() {
    await onSubmit({ name: name.trim(), status })
  }

  const title = mode === "create" ? "Novo template" : "Editar template"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Relatório Financeiro" />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ExcelTemplateStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!!isSubmitting || !name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
