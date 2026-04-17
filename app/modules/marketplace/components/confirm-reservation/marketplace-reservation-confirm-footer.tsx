import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"

export function MarketplaceReservationConfirmFooter(props: {
  busy?: boolean
  canConfirm: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const { busy, canConfirm, error, onCancel, onConfirm } = props

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Se houver barraca vinculada, ela tambem sera vinculada automaticamente a feira.
      </div>

      {error ? <div className="text-xs text-destructive">{error}</div> : null}

      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={busy || !canConfirm}
          className="rounded-xl"
        >
          {busy ? "Confirmando..." : "Confirmar e vincular a feira"}
        </Button>
      </DialogFooter>
    </div>
  )
}
