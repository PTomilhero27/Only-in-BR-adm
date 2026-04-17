import { Badge } from "@/components/ui/badge"
import { stallSizeLabel } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import type { MarketplaceReservation } from "@/app/modules/marketplace/marketplace.schema"

function InfoBlock(props: {
  label: string
  value: string
  helper?: string | null
}) {
  const { label, value, helper } = props

  return (
    <div className="min-w-0 rounded-2xl border bg-background p-3 sm:p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-foreground">{value}</div>
      {helper ? <div className="mt-1 break-words text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  )
}

export function NotifyMissingStallSummary(props: {
  reservation: MarketplaceReservation
  fairName?: string | null
  slotLabel: string
}) {
  const { reservation, fairName, slotLabel } = props

  return (
    <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Resumo da reserva</div>
          <div className="text-xs text-muted-foreground">
            Confira os dados antes de enviar o alerta manual ao expositor.
          </div>
        </div>

        <Badge variant="outline" className="rounded-full px-3">
          {reservation.status === "CONVERTED" ? "Reserva convertida" : reservation.status}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoBlock
          label="Expositor"
          value={reservation.owner?.fullName?.trim() || "Nao informado"}
          helper={reservation.owner?.email?.trim() || reservation.owner?.phone?.trim() || null}
        />
        <InfoBlock
          label="Feira"
          value={fairName?.trim() || "Nao informada"}
          helper={reservation.fairId}
        />
        <InfoBlock
          label="Slot"
          value={slotLabel}
          helper={reservation.fairMapSlot?.label ?? reservation.fairMapSlot?.code ?? null}
        />
        <InfoBlock
          label="Tipo reservado"
          value={
            reservation.selectedTentType
              ? stallSizeLabel(reservation.selectedTentType)
              : "Nao informado"
          }
        />
      </div>
    </div>
  )
}
