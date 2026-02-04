"use client"

/**
 * Modal para alteração de status do expositor (Owner ↔ Fair).
 * Responsabilidade:
 * - Exibir nome + documento do expositor (contexto antes de alterar)
 * - Permitir escolher um novo status (radio group)
 * - Salvar via mutation (PATCH) e fechar ao sucesso
 *
 * Ajustes desta iteração:
 * - Cards de status ficam 100% clicáveis (cursor-pointer + onClick)
 * - Card selecionado usa a “cor do status” (meta do getOwnerFairStatusMeta)
 * - Mantém RadioGroupItem para acessibilidade, mas o click principal é no card
 * - toasts de sucesso/erro padronizados
 */

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

// ✅ Reaproveita as cores padronizadas do status (mesmas badges da tabela)
import { getOwnerFairStatusMeta } from "../table/owner-fair-status-badges"
import { Spinner } from "@/components/ui/spinner"

type Props = {
  /** Id da feira (fallback, caso a row não tenha fairId por algum motivo) */
  fairId: string
  /** Linha do expositor na tabela */
  row: FairExhibitorRow | null
  /** Controle de abertura do modal */
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
      value: "CONCLUIDO",
      title: "Concluído",
      description: "Fluxo finalizado (pago + assinado + vínculos completos).",
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
    if (!row) return
    if (!hasChange) return

    try {
      await mutation.mutateAsync({
        ownerId: row.owner.id,
        status: nextStatus,
      })

      toast.success({
        title: "Status atualizado",
        subtitle: `${name} (${document}) → ${ownerFairStatusLabel(nextStatus)}.`,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Alterar status do expositor</DialogTitle>
          <DialogDescription>
            Selecione o novo status e salve para atualizar a lista da feira.
          </DialogDescription>
        </DialogHeader>

        {/* Contexto do expositor */}
        <div className="rounded-xl border bg-muted/10 p-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {name}{" "}
                  <span className="text-muted-foreground font-normal">({personType})</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">{document}</div>
              </div>

              <Badge variant="outline" className="rounded-full">
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
        </div>

        <Separator />

        {/* Seleção de status */}
        <div className="space-y-3">
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
                    selected ? "border-muted bg-muted/20" : "hover:bg-muted/10",
                    // ✅ “cor do status” quando selecionado
                    selected && meta.className,
                  )}
                >
                  {/* Mantém o radio visível (acessibilidade), mas o card inteiro é clicável */}
                  <RadioGroupItem value={opt.value} id={`status-${opt.value}`} />

                  <div className="min-w-0">
                    <Label
                      htmlFor={`status-${opt.value}`}
                      className="text-sm font-medium cursor-pointer"
                    >
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={!row || !hasChange || isSaving}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                Salvando
                <Spinner className="h-4 w-4" />
              </span>
            ) : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
