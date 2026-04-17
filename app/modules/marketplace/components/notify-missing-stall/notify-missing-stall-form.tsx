import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { NotifyMissingStallFormState } from "./notify-missing-stall.utils"

export function NotifyMissingStallForm(props: {
  form: NotifyMissingStallFormState
  onNotesChange: (notes: string) => void
  onForceChange: (force: boolean) => void
}) {
  const { form, onNotesChange, onForceChange } = props

  return (
    <div className="space-y-4 rounded-2xl border bg-background p-4 sm:p-5">
      <div className="space-y-1">
        <Label htmlFor="notify-missing-stall-notes" className="text-sm font-medium">
          Observacao opcional
        </Label>
        <Textarea
          id="notify-missing-stall-notes"
          value={form.notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Ex.: Precisamos da barraca vinculada para concluir a organizacao do mapa da feira."
          className="min-h-24 resize-y sm:min-h-28"
        />
      </div>

      <label
        htmlFor="notify-missing-stall-force"
        className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-muted/20 p-3.5 sm:p-4"
      >
        <Checkbox
          id="notify-missing-stall-force"
          checked={form.force}
          onCheckedChange={(checked) => onForceChange(Boolean(checked))}
          className="mt-0.5"
        />

        <div className="space-y-1">
          <div className="text-sm font-medium">
            Forcar envio mesmo se ja houver alerta recente
          </div>
          <div className="text-xs text-muted-foreground">
            Use apenas quando o admin precisar reenviar manualmente o aviso ao expositor.
          </div>
        </div>
      </label>
    </div>
  )
}
