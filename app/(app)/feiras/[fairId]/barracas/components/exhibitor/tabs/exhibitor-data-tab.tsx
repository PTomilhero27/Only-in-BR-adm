"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, CreditCard, Hash, Mail, MapPin, Phone } from "lucide-react"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { exhibitorDisplayName } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { clampText } from "../fair-exhibitor-details-dialog"

function InfoTile({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={mono ? "font-mono text-sm font-semibold truncate" : "text-sm font-semibold truncate"}>
            {clampText(value)}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExhibitorDataTab({ row }: { row: FairExhibitorRow | null }) {
  const title = row ? exhibitorDisplayName(row) : "—"
  const document = row?.owner?.document ?? "—"

  return (
    <>
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="grid gap-2 md:grid-cols-2">
            <InfoTile icon={<CalendarDays className="h-4 w-4" />} label="Nome / Razão social" value={title} />
            <InfoTile icon={<Hash className="h-4 w-4" />} label="Documento" value={document} mono />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <InfoTile icon={<Mail className="h-4 w-4" />} label="E-mail" value={row?.owner?.email ?? null} />
            <InfoTile icon={<Phone className="h-4 w-4" />} label="Telefone" value={row?.owner?.phone ?? null} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <InfoTile icon={<MapPin className="h-4 w-4" />} label="Endereço completo" value={row?.owner?.addressFull ?? null} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <InfoTile icon={<CreditCard className="h-4 w-4" />} label="Banco" value={row?.owner?.bankName ?? null} />

          <div className="grid gap-3 md:grid-cols-2 mt-3">
            <InfoTile icon={<CreditCard className="h-4 w-4" />} label="Chave Pix" value={row?.owner?.pixKey ?? null} />
            <InfoTile icon={<CreditCard className="h-4 w-4" />} label="Agência" value={row?.owner?.bankAgency ?? null} mono />
            <InfoTile icon={<CreditCard className="h-4 w-4" />} label="Conta" value={row?.owner?.bankAccount ?? null} mono />
            <InfoTile icon={<CreditCard className="h-4 w-4" />} label="Tipo de conta" value={row?.owner?.bankAccountType ?? null} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
