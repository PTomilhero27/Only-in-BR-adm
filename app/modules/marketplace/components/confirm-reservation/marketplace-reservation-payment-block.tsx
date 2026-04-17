import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { UnitPriceInput } from "@/components/shared/unit-price-input"

import {
  formatCurrency,
  type ConfirmReservationFormState,
  type ConfirmReservationUnitPriceMode,
} from "./confirm-marketplace-reservation.utils"

export function MarketplaceReservationPaymentBlock(props: {
  form: ConfirmReservationFormState
  reservationPriceCents: number | null
  effectiveUnitPriceCents: number | null
  remainingCents: number
  onUnitPriceModeChange: (mode: ConfirmReservationUnitPriceMode) => void
  onUnitPriceCentsChange: (value: number) => void
  onPaidCentsChange: (value: number) => void
}) {
  const {
    form,
    reservationPriceCents,
    effectiveUnitPriceCents,
    remainingCents,
    onUnitPriceModeChange,
    onUnitPriceCentsChange,
    onPaidCentsChange,
  } = props

  const reservationPriceAvailable = reservationPriceCents !== null

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Bloco financeiro</div>
        <div className="text-xs text-muted-foreground">
          Defina o valor que sera confirmado agora e o saldo a parcelar, se houver.
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant={form.unitPriceMode === "reservation" ? "default" : "outline"}
          className="h-auto min-w-0 justify-between gap-2 rounded-2xl px-4 py-3 text-left whitespace-normal"
          disabled={!reservationPriceAvailable}
          onClick={() => onUnitPriceModeChange("reservation")}
        >
          <span className="min-w-0 flex-1">Usar preco da reserva</span>
          <Badge
            variant={form.unitPriceMode === "reservation" ? "secondary" : "outline"}
            className="shrink-0 rounded-full"
          >
            {formatCurrency(reservationPriceCents)}
          </Badge>
        </Button>

        <Button
          type="button"
          variant={form.unitPriceMode === "custom" ? "default" : "outline"}
          className="h-auto min-w-0 justify-between gap-2 rounded-2xl px-4 py-3 text-left whitespace-normal"
          onClick={() => onUnitPriceModeChange("custom")}
        >
          <span className="min-w-0 flex-1">Informar valor manual</span>
          <Badge
            variant={form.unitPriceMode === "custom" ? "secondary" : "outline"}
            className="shrink-0 rounded-full"
          >
            Opcional
          </Badge>
        </Button>
      </div>

      {form.unitPriceMode === "custom" ? (
        <div className="space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Valor unitario
          </Label>
          <UnitPriceInput
            valueCents={form.unitPriceCents}
            onChangeCents={onUnitPriceCentsChange}
          />
          <div className="text-xs text-muted-foreground">
            Se preferir, deixe o modo acima em &quot;Usar preco da reserva&quot; para usar o valor capturado automaticamente.
          </div>
        </div>
      ) : (
        <Card className="rounded-2xl border bg-muted/20 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Preco capturado da reserva
          </div>
          <div className="mt-2 text-lg font-semibold">
            {formatCurrency(effectiveUnitPriceCents)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Quando este modo estiver ativo, o sistema usa o preco capturado da reserva.
          </div>
        </Card>
      )}

      <div className="space-y-1">
        <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Valor pago
        </Label>
        <UnitPriceInput
          valueCents={form.paidCents}
          onChangeCents={onPaidCentsChange}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        <FinancialCard label="Total considerado" value={formatCurrency(effectiveUnitPriceCents)} />
        <FinancialCard label="Pago agora" value={formatCurrency(form.paidCents)} />
        <FinancialCard label="Restante" value={formatCurrency(remainingCents)} highlight={remainingCents > 0} />
      </div>
    </div>
  )
}

function FinancialCard(props: {
  label: string
  value: string
  highlight?: boolean
}) {
  const { label, value, highlight } = props

  return (
    <Card className="min-w-0 rounded-2xl border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] leading-tight text-muted-foreground">
        {label}
      </div>
      <div className={highlight ? "mt-2 break-words text-base font-semibold text-amber-700" : "mt-2 break-words text-base font-semibold"}>
        {value}
      </div>
    </Card>
  )
}
