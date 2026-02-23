"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"

import { UnitPriceInput } from "@/app/(app)/interessados/components/tabs/fairs/unit-price-input"

import type {
  CreatePurchaseAdjustmentInput,
  PurchaseAdjustmentType,
} from "@/app/modules/owner-fair-purchases/owner-fair-purchases.schema"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void

  disabled?: boolean

  // contexto
  exhibitorName?: string | null
  purchaseLabel?: string | null

  // form default
  defaultType?: PurchaseAdjustmentType

  onConfirm: (input: CreatePurchaseAdjustmentInput) => Promise<void> | void
}

export function PurchaseAdjustmentDialog(props: Props) {
  const {
    open,
    onOpenChange,
    disabled,
    exhibitorName,
    purchaseLabel,
    defaultType = "DISCOUNT",
    onConfirm,
  } = props

  const [type, setType] = React.useState<PurchaseAdjustmentType>(defaultType)
  const [amountCents, setAmountCents] = React.useState<number>(0)
  const [reason, setReason] = React.useState<string>("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setType(defaultType)
    setAmountCents(0)
    setReason("")
  }, [open, defaultType])

  async function handleSubmit() {
    if (disabled) return
    if (!Number.isFinite(amountCents) || amountCents <= 0) return

    try {
      setIsSubmitting(true)
      await onConfirm({
        type,
        amountCents,
        reason: reason.trim() || undefined,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = Boolean(disabled || isSubmitting)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Ajustar valor da compra</DialogTitle>
          <DialogDescription>
            {exhibitorName ? (
              <>
                Expositor: <span className="font-medium text-foreground">{exhibitorName}</span>
                {purchaseLabel ? (
                  <>
                    {" "}
                    · Compra: <span className="font-medium text-foreground">{purchaseLabel}</span>
                  </>
                ) : null}
              </>
            ) : (
              "Aplique desconto ou acréscimo nesta compra."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as PurchaseAdjustmentType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="DISCOUNT">Desconto</TabsTrigger>
              <TabsTrigger value="SURCHARGE">Acréscimo</TabsTrigger>
            </TabsList>

            <TabsContent value="DISCOUNT" className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                Reduz o total efetivo da compra.
              </div>
            </TabsContent>

            <TabsContent value="SURCHARGE" className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                Adiciona valor ao total efetivo da compra.
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Valor (R$)</Label>
              <UnitPriceInput
                valueCents={amountCents}
                disabled={busy}
                onChangeCents={setAmountCents}
              />
              <div className="text-[11px] text-muted-foreground">
                Informe em reais (o sistema guarda em centavos).
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input
                value={reason}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
                placeholder='Ex.: "fidelidade", "taxa extra", etc'
              />
              <div className="text-[11px] text-muted-foreground">
                Ajuda no histórico/auditoria.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              className={cn(
                "min-w-36",
                type === "DISCOUNT"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-blue-600 hover:bg-blue-700",
              )}
              disabled={busy || amountCents <= 0}
              onClick={handleSubmit}
            >
              Salvar
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Obs.: após salvar, o total efetivo da compra é recalculado no backend.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}