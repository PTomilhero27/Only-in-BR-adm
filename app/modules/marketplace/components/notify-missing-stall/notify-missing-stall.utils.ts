import type {
  MarketplaceReservation,
  MarketplaceSlotStatus,
  NotifyMissingStallInput,
} from "@/app/modules/marketplace/marketplace.schema"

export type NotifyMissingStallFormState = {
  force: boolean
  notes: string
}

export function buildInitialNotifyMissingStallForm(): NotifyMissingStallFormState {
  return {
    force: false,
    notes: "",
  }
}

export function buildNotifyMissingStallPayload(
  form: NotifyMissingStallFormState,
): NotifyMissingStallInput {
  const notes = form.notes.trim()

  return {
    force: form.force || undefined,
    notes: notes || undefined,
  }
}

export function canNotifyMissingStall(params: {
  reservation: MarketplaceReservation | null
  slotStatus: MarketplaceSlotStatus | null | undefined
  hasLinkedSlotStall: boolean
  hasReservationStall: boolean
}) {
  const { reservation, slotStatus, hasLinkedSlotStall, hasReservationStall } = params

  return Boolean(
    reservation &&
      reservation.status === "CONVERTED" &&
      slotStatus === "CONFIRMED" &&
      !hasLinkedSlotStall &&
      !hasReservationStall,
  )
}
