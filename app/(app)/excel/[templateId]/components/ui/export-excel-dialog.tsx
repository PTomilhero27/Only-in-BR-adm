"use client"

/**
 * ExportExcelDialog
 *
 * Responsabilidade:
 * - Coletar o contexto de exportação para o backend:
 *   - qual feira
 *   - exportar TODOS ou UM expositor específico
 *
 * Decisão:
 * - Isso fica separado do Builder (não polui a edição de células).
 * - Payload explícito evita “contratos implícitos”.
 */

import * as React from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

import type { ExcelDataset } from "@/app/modules/excel/excel.schema"
import { useCreateExcelExportMutation } from "@/app/modules/excel/excel.queries"

// ✅ Reuso do que você já tem no Admin
import { useFairExhibitorsQuery } from "@/app/modules/fairs/exhibitors/exhibitors.queries"
import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query"

type ExportMode = "FAIR_ALL" | "FAIR_EXHIBITOR"

export function ExportExcelDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  templateId: string
  templateDatasets: ExcelDataset[]
}) {
  const { open, onOpenChange, templateId } = props

  const [mode, setMode] = React.useState<ExportMode>("FAIR_ALL")
  const [fairId, setFairId] = React.useState("")
  const [ownerId, setOwnerId] = React.useState("")

  const fairsQ = useFairsQuery({ status: "ATIVA"}) // ajuste se teu DTO for diferente
  const exhibitorsQ = useFairExhibitorsQuery(fairId)

  const exportMut = useCreateExcelExportMutation()

  const fairs = fairsQ.data ?? []
  const exhibitors = exhibitorsQ.data?.items ?? []

  function resetState() {
    setMode("FAIR_ALL")
    setFairId("")
    setOwnerId("")
  }

  async function handleExport() {
    if (!fairId) {
      toast.error({title: "Selecione uma feira para exportar."})
      return
    }
    if (mode === "FAIR_EXHIBITOR" && !ownerId) {
      toast.error({title: "Selecione um expositor para exportar."})
      return
    }

    try {
      /**
       * ✅ Payload explícito para o backend:
       * - templateId
       * - scope: define o “tipo” e os ids necessários
       *
       * Sugestão de contrato:
       * scopeType: FAIR_ALL | FAIR_EXHIBITOR
       * fairId obrigatório
       * ownerId obrigatório quando FAIR_EXHIBITOR
       */
      await exportMut.mutateAsync({
        templateId,
        fairId,
        ownerId: mode === "FAIR_EXHIBITOR" ? ownerId : undefined,
      })

      toast.success({title: "Exportação iniciada. Seu download deve começar em instantes."})
      onOpenChange(false)
    } catch (e: any) {
      toast.error({title: e?.message || "Erro ao exportar."})
    }
  }

  return (
    <>
      <Button variant="secondary" className="h-9" onClick={() => onOpenChange(true)}>
        <Download className="mr-2 h-4 w-4" />
        Exportar
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v)
          if (!v) resetState()
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Exportar Excel</DialogTitle>
            <DialogDescription>
              Escolha o contexto (feira e escopo) para o backend gerar o arquivo baseado neste template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as ExportMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="FAIR_ALL">Todos da feira</TabsTrigger>
                <TabsTrigger value="FAIR_EXHIBITOR">Expositor específico</TabsTrigger>
              </TabsList>

              <TabsContent value="FAIR_ALL" className="mt-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  Gera um Excel com os dados da feira e listas completas (ex.: expositores/barracas/financeiro).
                </div>
              </TabsContent>

              <TabsContent value="FAIR_EXHIBITOR" className="mt-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  Gera um Excel focado em um expositor (útil para contrato/financeiro individual).
                </div>
              </TabsContent>
            </Tabs>

            {/* Feira */}
            <div className="space-y-1">
              <div className="text-xs font-medium">Feira</div>
              <Select
                value={fairId}
                onValueChange={(v) => {
                  setFairId(v)
                  setOwnerId("")
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={fairsQ.isLoading ? "Carregando…" : "Selecione a feira"} />
                </SelectTrigger>
                <SelectContent>
                  {fairs.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expositor (condicional) */}
            {mode === "FAIR_EXHIBITOR" && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Expositor</div>
                <Select value={ownerId} onValueChange={setOwnerId} disabled={!fairId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={!fairId ? "Selecione uma feira primeiro" : "Selecione o expositor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {exhibitors.map((x: any) => (
                      <SelectItem key={x.ownerId} value={x.ownerId}>
                        {x.owner?.fullName ?? x.owner?.document ?? x.ownerId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exportMut.isPending}>
              {exportMut.isPending ? "Exportando…" : "Gerar Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
