"use client"

/**
 * BuilderTopBar
 *
 * Upgrade:
 * - Permite injetar ações extras à direita (ex.: ⚙️ Configurações)
 */

import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function BuilderTopBar(props: {
  title: string
  status: string
  onBack: () => void
  onSave: () => void
  saving?: boolean
  rightSlot?: React.ReactNode
}) {
  const { title, status, onBack, onSave, saving, rightSlot } = props

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">{title}</div>
            <Badge variant="secondary">{status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Clique em uma célula para editar.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        <Button onClick={onSave} disabled={!!saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  )
}
