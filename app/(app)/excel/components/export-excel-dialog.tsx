// src/modules/excel/components/export-excel-dialog.tsx
"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateExcelExportMutation } from "@/app/modules/excel/excel.queries"
import { downloadBlobAsFile } from "../utils/download"


/**
 * Dialog para gerar e baixar Excel.
 * Responsabilidade:
 * - Capturar parâmetros mínimos (fairId obrigatório, ownerId opcional)
 * - Chamar POST /excel-exports e baixar o Blob como .xlsx
 *
 * Decisão:
 * - MVP usa inputs simples.
 * - Depois trocamos por seletores (FairPicker / OwnerPicker) sem mexer no backend.
 */
export function ExportExcelDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  templateId: string
  templateName: string
}) {
  const { open, onOpenChange, templateId, templateName } = props

  const exportMut = useCreateExcelExportMutation()

  const [fairId, setFairId] = useState("")
  const [ownerId, setOwnerId] = useState("")

  async function handleExport() {
    const blob = await exportMut.mutateAsync({
      templateId,
      fairId: fairId.trim(),
      ownerId: ownerId.trim() || undefined,
    })

    const safeName = (templateName || "relatorio").replace(/[^\w\s-]/g, "").trim()
    const fileName = `${safeName}.xlsx`

    downloadBlobAsFile(blob, fileName)
    onOpenChange(false)
  }

  const canExport = !!templateId && !!fairId.trim() && !exportMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Input value={templateName} readOnly />
          </div>

          <div className="space-y-2">
            <Label>fairId (obrigatório)</Label>
            <Input value={fairId} onChange={(e) => setFairId(e.target.value)} placeholder="UUID da feira" />
            <p className="text-xs text-muted-foreground">
              MVP: informe o ID da feira. Depois integraremos com um seletor visual.
            </p>
          </div>

          <div className="space-y-2">
            <Label>ownerId (opcional)</Label>
            <Input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="ID do expositor (opcional)" />
            <p className="text-xs text-muted-foreground">
              Use quando o relatório for “por expositor”. Caso contrário, deixe em branco.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exportMut.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={!canExport}>
            <Download className="mr-2 h-4 w-4" />
            Gerar e baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
