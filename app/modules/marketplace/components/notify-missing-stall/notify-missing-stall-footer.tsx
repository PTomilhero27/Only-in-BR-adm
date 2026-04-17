import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"

export function NotifyMissingStallFooter(props: {
  busy?: boolean
  canSubmit: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { busy, canSubmit, onCancel, onConfirm } = props

  return (
    <DialogFooter className="gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={onConfirm}
        disabled={busy || !canSubmit}
        className="rounded-xl"
      >
        {busy ? "Enviando..." : "Enviar alerta"}
      </Button>
    </DialogFooter>
  )
}
