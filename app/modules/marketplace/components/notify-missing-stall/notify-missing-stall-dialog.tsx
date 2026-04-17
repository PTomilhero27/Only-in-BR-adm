"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/toast"
import type { MarketplaceReservation } from "@/app/modules/marketplace/marketplace.schema"
import { useNotifyMissingStallMutation } from "@/app/modules/marketplace/marketplace.queries"
import { ApiError } from "@/app/shared/http/errors"
import { getErrorMessage } from "@/app/shared/utils/get-error-message"

import { NotifyMissingStallFooter } from "./notify-missing-stall-footer"
import { NotifyMissingStallForm } from "./notify-missing-stall-form"
import { NotifyMissingStallSummary } from "./notify-missing-stall-summary"
import {
  buildInitialNotifyMissingStallForm,
  buildNotifyMissingStallPayload,
} from "./notify-missing-stall.utils"

function getNotifyMissingStallErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Ja existe um alerta recente para esta reserva ou o slot ja possui barraca vinculada."
    }

    if (error.status === 503) {
      return "Nao foi possivel enviar o e-mail neste momento."
    }

    if (error.status === 400) {
      return error.message || "Reserva invalida para esse fluxo, sem e-mail cadastrado ou slot fora das regras."
    }
  }

  return getErrorMessage(error)
}

export function NotifyMissingStallDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fairId: string
  fairName?: string | null
  slotLabel: string
  reservation: MarketplaceReservation | null
}) {
  const { open, onOpenChange, fairId, fairName, slotLabel, reservation } = props

  const notifyMissingStall = useNotifyMissingStallMutation(fairId)
  const [form, setForm] = React.useState(buildInitialNotifyMissingStallForm)

  React.useEffect(() => {
    if (!open) return
    setForm(buildInitialNotifyMissingStallForm())
  }, [open, reservation])

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (notifyMissingStall.isPending) return
      onOpenChange(nextOpen)
    },
    [notifyMissingStall.isPending, onOpenChange],
  )

  const handleConfirm = React.useCallback(async () => {
    if (!reservation) return

    try {
      const response = await notifyMissingStall.mutateAsync({
        reservationId: reservation.id,
        input: buildNotifyMissingStallPayload(form),
      })

      toast.success({
        title: response.message || "E-mail de alerta enviado com sucesso.",
      })

      onOpenChange(false)
    } catch (error) {
      toast.error({
        title: "Erro ao enviar alerta",
        subtitle: getNotifyMissingStallErrorMessage(error),
      })
    }
  }, [form, notifyMissingStall, onOpenChange, reservation])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-4xl">
        <DialogHeader className="border-b px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>Enviar alerta de barraca pendente</DialogTitle>
          <DialogDescription>
            Este envio avisa o expositor que o slot ja esta confirmado, mas ainda nao ha barraca vinculada ao espaco.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-9rem)]">
          <div className="grid gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
            {reservation ? (
              <NotifyMissingStallSummary
                reservation={reservation}
                fairName={fairName}
                slotLabel={slotLabel}
              />
            ) : null}

            <NotifyMissingStallForm
              form={form}
              onNotesChange={(notes) =>
                setForm((current) => ({
                  ...current,
                  notes,
                }))
              }
              onForceChange={(force) =>
                setForm((current) => ({
                  ...current,
                  force,
                }))
              }
            />
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-4 sm:px-6">
          <NotifyMissingStallFooter
            busy={notifyMissingStall.isPending}
            canSubmit={Boolean(reservation)}
            onCancel={() => handleOpenChange(false)}
            onConfirm={() => void handleConfirm()}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
