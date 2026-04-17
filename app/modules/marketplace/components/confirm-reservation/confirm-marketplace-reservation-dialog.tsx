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
import { useAvailableStallFairsQuery } from "@/app/modules/fair-maps/fair-maps.queries"
import { useConfirmMarketplaceReservationMutation } from "@/app/modules/marketplace/marketplace.queries"
import type { MarketplaceReservation } from "@/app/modules/marketplace/marketplace.schema"
import { getErrorMessage } from "@/app/shared/utils/get-error-message"

import {
  buildConfirmReservationPayload,
  buildInitialConfirmReservationForm,
  buildReservationStallOptions,
  filterCompatibleStallOptions,
  getEffectiveUnitPriceCents,
  getRemainingCents,
  getReservationCapturedPriceCents,
  getReservationLinkedStall,
  reconcileInstallments,
  validateConfirmReservationForm,
} from "./confirm-marketplace-reservation.utils"
import { MarketplaceReservationConfirmFooter } from "./marketplace-reservation-confirm-footer"
import { MarketplaceReservationInstallmentsForm } from "./marketplace-reservation-installments-form"
import { MarketplaceReservationPaymentBlock } from "./marketplace-reservation-payment-block"
import { MarketplaceReservationStallSelect } from "./marketplace-reservation-stall-select"
import { MarketplaceReservationSummary } from "./marketplace-reservation-summary"

export function ConfirmMarketplaceReservationDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fairId: string
  fairName?: string | null
  slotLabel: string
  reservation: MarketplaceReservation | null
}) {
  const { open, onOpenChange, fairId, fairName, slotLabel, reservation } = props

  const availableStallsQuery = useAvailableStallFairsQuery(
    fairId,
    open && Boolean(reservation),
  )
  const confirmReservation = useConfirmMarketplaceReservationMutation(fairId)

  const [form, setForm] = React.useState(() =>
    buildInitialConfirmReservationForm(reservation),
  )

  React.useEffect(() => {
    if (!open) return
    setForm(buildInitialConfirmReservationForm(reservation))
  }, [open, reservation])

  const linkedStall = React.useMemo(
    () => getReservationLinkedStall(reservation),
    [reservation],
  )
  const capturedPriceCents = React.useMemo(
    () => getReservationCapturedPriceCents(reservation),
    [reservation],
  )

  const stallOptions = React.useMemo(
    () =>
      buildReservationStallOptions(
        availableStallsQuery.data ?? [],
        linkedStall,
      ),
    [availableStallsQuery.data, linkedStall],
  )

  const compatibleStallOptions = React.useMemo(
    () => filterCompatibleStallOptions(stallOptions, reservation?.selectedTentType),
    [reservation?.selectedTentType, stallOptions],
  )

  const selectedStall = React.useMemo(() => {
    const fromOptions =
      stallOptions.find((option) => option.stallId === form.stallId) ?? null

    if (fromOptions) {
      return {
        stallId: fromOptions.stallId,
        stallName: fromOptions.stallName,
        stallSize: fromOptions.stallSize,
        ownerName: fromOptions.ownerName,
      }
    }

    if (linkedStall?.stallId === form.stallId) {
      return linkedStall
    }

    return null
  }, [form.stallId, linkedStall, stallOptions])

  const effectiveUnitPriceCents = React.useMemo(
    () => getEffectiveUnitPriceCents(reservation, form),
    [form, reservation],
  )
  const remainingCents = React.useMemo(
    () => getRemainingCents(reservation, form),
    [form, reservation],
  )

  const formError = React.useMemo(
    () =>
      validateConfirmReservationForm({
        reservation,
        form,
        selectedStall,
      }),
    [form, reservation, selectedStall],
  )

  const syncFinancialState = React.useCallback(
    (draft: typeof form) => {
      const nextUnitPriceCents =
        draft.unitPriceMode === "custom" && draft.unitPriceCents === 0 && capturedPriceCents
          ? capturedPriceCents
          : draft.unitPriceCents

      const nextDraft = {
        ...draft,
        unitPriceCents: nextUnitPriceCents,
      }

      const nextEffectiveUnitPriceCents = getEffectiveUnitPriceCents(
        reservation,
        nextDraft,
      )
      const safePaidCents =
        nextEffectiveUnitPriceCents === null
          ? Math.max(0, nextDraft.paidCents)
          : Math.min(
              Math.max(0, nextDraft.paidCents),
              Math.max(0, nextEffectiveUnitPriceCents),
            )

      if (nextEffectiveUnitPriceCents === null) {
        return {
          ...nextDraft,
          paidCents: safePaidCents,
          installmentsCount: 0,
          installments: [],
        }
      }

      const nextRemainingCents = Math.max(
        0,
        nextEffectiveUnitPriceCents - safePaidCents,
      )
      const nextInstallmentsCount = Math.max(
        0,
        Math.min(12, Number(nextDraft.installmentsCount) || 0),
      )

      return {
        ...nextDraft,
        paidCents: safePaidCents,
        installmentsCount: nextRemainingCents === 0 ? 0 : nextInstallmentsCount,
        installments:
          nextRemainingCents === 0 || nextInstallmentsCount === 0
            ? []
            : reconcileInstallments({
                remainingCents: nextRemainingCents,
                installmentsCount: nextInstallmentsCount,
                current: nextDraft.installments,
              }),
      }
    },
    [capturedPriceCents, reservation],
  )

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (confirmReservation.isPending) return
      onOpenChange(nextOpen)
    },
    [confirmReservation.isPending, onOpenChange],
  )

  const handleConfirm = React.useCallback(async () => {
    if (!reservation) return

    if (formError) {
      toast.error({
        title: "Revise os dados da confirmacao",
        subtitle: formError,
      })
      return
    }

    try {
      await confirmReservation.mutateAsync({
        reservationId: reservation.id,
        input: buildConfirmReservationPayload({
          reservation,
          form,
        }),
      })

      toast.success({
        title:
          "Reserva confirmada com sucesso. O expositor ja foi vinculado a feira.",
        subtitle:
          "Se houver barraca vinculada, ela tambem sera vinculada automaticamente a feira.",
      })

      onOpenChange(false)
    } catch (error) {
      toast.error({
        title: "Erro ao confirmar reserva",
        subtitle: getErrorMessage(error),
      })
    }
  }, [confirmReservation, form, formError, onOpenChange, reservation])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-6xl">
        <DialogHeader className="border-b px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>Confirmar reserva do slot</DialogTitle>
          <DialogDescription>
            Revise os dados financeiros e confirme a conversao desta reserva no marketplace.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-9rem)]">
          <div className="grid gap-5 px-4 py-4 sm:px-6 sm:py-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="min-w-0 space-y-5 sm:space-y-6">
              {reservation ? (
                <MarketplaceReservationSummary
                  reservation={reservation}
                  fairName={fairName}
                  slotLabel={slotLabel}
                  capturedPriceCents={capturedPriceCents}
                  linkedStall={linkedStall}
                />
              ) : null}

              <MarketplaceReservationStallSelect
                loading={availableStallsQuery.isLoading}
                loadError={
                  availableStallsQuery.error
                    ? getErrorMessage(availableStallsQuery.error)
                    : null
                }
                reservationTentType={reservation?.selectedTentType ?? null}
                selectedStallId={form.stallId}
                selectedStall={selectedStall}
                options={compatibleStallOptions}
                onSelectStallId={(stallId) =>
                  setForm((current) => ({
                    ...current,
                    stallId,
                  }))
                }
                onClear={() =>
                  setForm((current) => ({
                    ...current,
                    stallId: "",
                  }))
                }
              />
            </div>

            <div className="min-w-0 space-y-5 sm:space-y-6">
              <MarketplaceReservationPaymentBlock
                form={form}
                reservationPriceCents={capturedPriceCents}
                effectiveUnitPriceCents={effectiveUnitPriceCents}
                remainingCents={remainingCents}
                onUnitPriceModeChange={(unitPriceMode) =>
                  setForm((current) =>
                    syncFinancialState({
                      ...current,
                      unitPriceMode,
                    }),
                  )
                }
                onUnitPriceCentsChange={(unitPriceCents) =>
                  setForm((current) =>
                    syncFinancialState({
                      ...current,
                      unitPriceCents,
                    }),
                  )
                }
                onPaidCentsChange={(paidCents) =>
                  setForm((current) =>
                    syncFinancialState({
                      ...current,
                      paidCents,
                    }),
                  )
                }
              />

              <MarketplaceReservationInstallmentsForm
                remainingCents={remainingCents}
                installmentsCount={form.installmentsCount}
                installments={form.installments}
                onInstallmentsCountChange={(installmentsCount) =>
                  setForm((current) =>
                    syncFinancialState({
                      ...current,
                      installmentsCount,
                    }),
                  )
                }
                onInstallmentChange={(installmentNumber, patch) =>
                  setForm((current) => ({
                    ...current,
                    installments: current.installments.map((installment) =>
                      installment.number === installmentNumber
                        ? { ...installment, ...patch }
                        : installment,
                    ),
                  }))
                }
              />
            </div>
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-4 sm:px-6">
          <MarketplaceReservationConfirmFooter
            busy={confirmReservation.isPending}
            canConfirm={Boolean(reservation) && !formError}
            error={formError}
            onCancel={() => handleOpenChange(false)}
            onConfirm={() => void handleConfirm()}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
