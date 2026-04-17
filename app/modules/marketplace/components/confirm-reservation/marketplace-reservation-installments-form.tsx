import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { UnitPriceInput } from "@/components/shared/unit-price-input"

import {
  formatCurrency,
  type ConfirmReservationInstallmentForm,
} from "./confirm-marketplace-reservation.utils"

export function MarketplaceReservationInstallmentsForm(props: {
  remainingCents: number
  installmentsCount: number
  installments: ConfirmReservationInstallmentForm[]
  onInstallmentsCountChange: (count: number) => void
  onInstallmentChange: (
    installmentNumber: number,
    patch: Partial<ConfirmReservationInstallmentForm>,
  ) => void
}) {
  const {
    remainingCents,
    installmentsCount,
    installments,
    onInstallmentsCountChange,
    onInstallmentChange,
  } = props

  const installmentsTotalCents = installments.reduce(
    (acc, installment) => acc + (installment.amountCents ?? 0),
    0,
  )

  if (remainingCents === 0) {
    return (
      <Card className="rounded-2xl border bg-emerald-50/50 p-4">
        <div className="text-sm font-semibold text-emerald-800">Saldo quitado</div>
        <div className="mt-1 text-xs text-emerald-700">
          Como o restante a pagar e zero, nenhuma parcela sera enviada ao backend.
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Lista de parcelas</div>
        <div className="text-xs text-muted-foreground">
          Informe quantidade, vencimentos e valores do saldo remanescente.
        </div>
      </div>

      <Card className="rounded-2xl border bg-muted/20 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Restante
            </div>
            <div className="mt-2 text-base font-semibold">{formatCurrency(remainingCents)}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Soma das parcelas
            </div>
            <div className="mt-2 text-base font-semibold">{formatCurrency(installmentsTotalCents)}</div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Quantidade de parcelas
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(installmentsCount)}
            onChange={(event) => {
              const raw = event.target.value
              if (!/^\d*$/.test(raw)) return

              const nextCount = raw === "" ? 0 : Math.max(0, Math.min(12, Number(raw)))
              onInstallmentsCountChange(nextCount)
            }}
          />
        </div>
      </Card>

      {installmentsCount > 0 ? (
        <div className="space-y-3">
          {installments.map((installment) => (
            <Card
              key={installment.clientId}
              className="rounded-2xl border bg-background p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Parcela {installment.number}</div>
                <div className="text-sm font-semibold text-emerald-700">
                  {formatCurrency(installment.amountCents)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Vencimento
                  </Label>
                  <Input
                    type="date"
                    value={installment.dueDate}
                    onChange={(event) =>
                      onInstallmentChange(installment.number, {
                        dueDate: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Valor
                  </Label>
                  <UnitPriceInput
                    valueCents={installment.amountCents}
                    onChangeCents={(amountCents) =>
                      onInstallmentChange(installment.number, { amountCents })
                    }
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="text-sm font-semibold text-amber-800">Parcelas pendentes</div>
          <div className="mt-1 text-xs text-amber-700">
            Como ainda existe saldo, informe a quantidade de parcelas para gerar a lista.
          </div>
        </Card>
      )}
    </div>
  )
}
