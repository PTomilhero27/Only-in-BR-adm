"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"

import {
  exhibitorDisplayName,
  type FairExhibitorRow,
  type OwnerFairStatus,
  ownerFairStatusLabel,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { useUpdateFairExhibitorStatusMutation } from "@/app/modules/fairs/exhibitors/exhibitors.queries"

import { toast } from "@/components/ui/toast"
import { getErrorMessage } from "@/app/shared/utils/get-error-message"
import { getOwnerFairStatusMeta } from "../table/owner-fair-status-badges"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {
  fairId: string
  row: FairExhibitorRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_OPTIONS: Array<{
  value: OwnerFairStatus
  title: string
  description: string
}> = [
  {
    value: "SELECIONADO",
    title: "Selecionado",
    description: "Expositor aprovado/selecionado para a feira.",
  },
  {
    value: "AGUARDANDO_PAGAMENTO",
    title: "Aguardando pagamento",
    description: "Expositor precisa concluir o pagamento.",
  },
  {
    value: "AGUARDANDO_ASSINATURA",
    title: "Aguardando assinatura",
    description: "Pagamento ok, falta assinatura do contrato.",
  },
  {
    value: "AGUARDANDO_BARRACAS",
    title: "Aguardando barracas",
    description: "Contrato assinado, falta vincular/selecionar as barracas.",
  },
  {
    value: "CONCLUIDO",
    title: "Concluído",
    description: "Pago + assinado + barracas vinculadas.",
  },
]

export function ChangeExhibitorStatusDialog({ fairId, row, open, onOpenChange }: Props) {
  const effectiveFairId = row?.fairId ?? fairId
  const mutation = useUpdateFairExhibitorStatusMutation(effectiveFairId)

  const currentStatus = row?.status ?? "SELECIONADO"
  const [nextStatus, setNextStatus] = React.useState<OwnerFairStatus>(currentStatus)

  const name = row ? exhibitorDisplayName(row) : "—"
  const document = row?.owner?.document ?? "—"
  const personType = row?.owner?.personType ?? "—"

  const hasChange = !!row && nextStatus !== currentStatus
  const isSaving = mutation.isPending

  React.useEffect(() => {
    if (!open) return
    setNextStatus(currentStatus)
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.ownerFairId])

  async function handleSave() {
    if (!row || !hasChange) return

    try {
      await mutation.mutateAsync({
        ownerId: row.owner.id,
        status: nextStatus,
      })

      toast.success({
        title: "Status atualizado",
        subtitle: `${name} → ${ownerFairStatusLabel(nextStatus)}`,
      })

      onOpenChange(false)
    } catch (err) {
      toast.error({
        title: "Erro ao atualizar status",
        subtitle: getErrorMessage(err),
      })
    }
  }

  return (
    <Dialog  open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          // ✅ grid resolve o bug do sticky e deixa 100% previsível no mobile
          "grid  grid-rows-[auto,1fr,auto] gap-0",
          
          // garante que nada “vaze” fora do modal
        )}
      >
        <div className="h-[90vh]  overflow-y-auto">

        {/* HEADER */}
        <DialogHeader className="pb-3">
          <DialogTitle>Alterar status</DialogTitle>
          <DialogDescription>Selecione o novo status do expositor.</DialogDescription>
        </DialogHeader>

        {/* BODY (scroll) */}
        <div className="">
          {/* Contexto do expositor */}
          <div className="rounded-xl border bg-muted/10 p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {name}{" "}
                  <span className="text-muted-foreground font-normal">({personType})</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">{document}</div>
              </div>

              <Badge variant="outline" className="shrink-0">
                Atual: {ownerFairStatusLabel(currentStatus)}
              </Badge>
            </div>

            {!row && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Nenhum expositor selecionado.
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Seleção de status */}
          <div className="space-y-2 pb-6">
            <div className="text-sm font-medium">Novo status</div>

            <RadioGroup
              value={nextStatus}
              onValueChange={(v) => setNextStatus(v as OwnerFairStatus)}
              className="space-y-2"
              disabled={!row || isSaving}
            >
              {STATUS_OPTIONS.map((opt) => {
                const selected = nextStatus === opt.value
                const meta = getOwnerFairStatusMeta(opt.value)

                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!row || isSaving) return
                      setNextStatus(opt.value)
                    }}
                    onKeyDown={(e) => {
                      if (!row || isSaving) return
                      if (e.key === "Enter" || e.key === " ") setNextStatus(opt.value)
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition",
                      "cursor-pointer select-none",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      selected ? meta.className : "hover:bg-muted/10"
                    )}
                  >
                    <RadioGroupItem value={opt.value} id={`status-${opt.value}`} />

                    <div className="min-w-0">
                      <Label htmlFor={`status-${opt.value}`} className="text-sm font-medium cursor-pointer">
                        {opt.title}
                      </Label>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>

            {mutation.isError && (
              <div className="text-xs text-destructive">
                Não foi possível salvar. Verifique sua conexão e tente novamente.
              </div>
            )}
          </div>
        </div>

        {/* FOOTER (fixo, sem sticky) */}
        <DialogFooter className="border-t bg-background pt-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>

            <Button onClick={handleSave} disabled={!row || !hasChange || isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  Salvando
                  <Spinner className="h-4 w-4" />
                </span>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </DialogFooter>
          
        </div>

      </DialogContent>
    </Dialog>
  )
}
