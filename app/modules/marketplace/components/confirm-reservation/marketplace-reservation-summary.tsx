import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { stallSizeLabel } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import type { MarketplaceReservation } from "@/app/modules/marketplace/marketplace.schema"

import {
  formatCurrency,
  formatDateTime,
  type ReservationLinkedStall,
} from "./confirm-marketplace-reservation.utils"

export function MarketplaceReservationSummary(props: {
  reservation: MarketplaceReservation
  fairName?: string | null
  slotLabel: string
  capturedPriceCents: number | null
  linkedStall: ReservationLinkedStall | null
}) {
  const { reservation, fairName, slotLabel, capturedPriceCents, linkedStall } = props

  return (
    <Card className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Resumo da reserva</div>
          <div className="text-xs text-muted-foreground">
            Confira os dados capturados antes de concluir o vinculo.
          </div>
        </div>

        <Badge variant="outline" className="rounded-full px-3">
          {reservation.status === "ACTIVE" ? "Reserva ativa" : reservation.status}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoBlock
          label="Expositor"
          value={reservation.owner?.fullName?.trim() || "Nao informado"}
          helper={
            [reservation.owner?.phone, reservation.owner?.email]
              .filter(Boolean)
              .join(" • ") || null
          }
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
          label="Tipo / tamanho reservado"
          value={
            reservation.selectedTentType
              ? stallSizeLabel(reservation.selectedTentType)
              : "Nao informado"
          }
          helper={reservation.expiresAt ? `Expira em ${formatDateTime(reservation.expiresAt)}` : null}
        />
        <InfoBlock
          label="Barraca vinculada na reserva"
          value={linkedStall?.stallName ?? "Nenhuma barraca vinculada"}
          helper={
            linkedStall
              ? [
                  linkedStall.stallSize ? stallSizeLabel(linkedStall.stallSize) : null,
                  linkedStall.ownerName,
                ]
                  .filter(Boolean)
                  .join(" • ")
              : null
          }
        />
        <InfoBlock
          label="Preco capturado da reserva"
          value={formatCurrency(capturedPriceCents)}
          helper={
            capturedPriceCents === null
              ? "Se necessario, informe um valor manual no bloco financeiro."
              : null
          }
        />
      </div>
    </Card>
  )
}

function InfoBlock(props: {
  label: string
  value: string
  helper?: string | null
}) {
  const { label, value, helper } = props

  return (
    <div className="min-w-0 rounded-2xl border bg-background p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-foreground">{value}</div>
      {helper ? <div className="mt-1 break-words text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  )
}
