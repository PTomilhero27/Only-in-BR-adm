"use client"

import { useMemo, useState } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Hash } from "lucide-react"

import type { FairExhibitorRow, FairTax, StallType } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { exhibitorDisplayName } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import { ChangeExhibitorStatusDialog } from "./change-exhibitor-status-dialog"
import { FairExhibitorDetailsTabs } from "./fair-exhibitor-details-tabs"

type Props = {
  fairId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  row: FairExhibitorRow | null
  initialTab?: "dados" | "barracas" | "observacoes"

  // ✅ NOVO: catálogo de taxas vindo do payload da feira
  taxes: FairTax[]
}

function isFilled(v?: string | null) {
  return Boolean(v && v.trim().length > 0)
}

export function clampText(v?: string | null) {
  if (!isFilled(v)) return "—"
  return v!.trim()
}

export function stallTypeLabel(type: StallType) {
  switch (type) {
    case "OPEN":
      return "Aberta"
    case "CLOSED":
      return "Fechada"
    case "TRAILER":
      return "Trailer"
    case "CART":
      return "Carrinho"
    default:
      return type
  }
}

export function formatCategoryLabel(input?: string | null) {
  if (!input?.trim()) return "—"
  const normalized = input.trim().replace(/[_-]+/g, " ").toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function FairExhibitorDetailsDialog({
  fairId,
  open,
  onOpenChange,
  row,
  initialTab = "dados",
  taxes,
}: Props) {
  const [statusOpen, setStatusOpen] = useState(false)
  const [tab, setTab] = useState<"dados" | "barracas" | "observacoes">(initialTab)

  const title = row ? exhibitorDisplayName(row) : "—"
  const document = row?.owner?.document ?? "—"

  const effectiveOpen = open && !!row

  /**
   * ✅ Remount controlado:
   * - reseta tab pro initialTab automaticamente
   * - sem useEffect/setState => sem warning em StrictMode
   */
  const tabsKey = useMemo(() => {
    const id = row?.ownerFairId ?? "no-row"
    return `${effectiveOpen ? "open" : "closed"}:${id}:${initialTab}`
  }, [effectiveOpen, row?.ownerFairId, initialTab])

  // quando remonta, volta pro initialTab
  // (isso roda só na render, sem effect)
  const safeTab = tab ?? initialTab

  return (
    <>
      <Dialog
        open={effectiveOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setStatusOpen(false)
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="max-w-7xl overflow-hidden h-[90vh] p-0 flex flex-col">
          {/* HEADER FIXO */}
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <DialogTitle className="text-2xl leading-tight truncate flex items-center gap-2">
                  <span className="truncate">{title}</span>

                  <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100 border border-amber-200">
                    {row?.owner?.personType ?? "—"}
                  </Badge>
                </DialogTitle>

                <div className="text-sm text-muted-foreground font-mono truncate flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  {document}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" onClick={() => setStatusOpen(true)} disabled={!row}>
                  Alterar status
                </Button>
              </div>
            </div>

            <Separator className="mt-5" />
          </DialogHeader>

          {/* ✅ Abas isoladas (remount controlado) */}
          <div className="flex-1 overflow-hidden">
            <FairExhibitorDetailsTabs
              key={tabsKey}
              fairId={fairId}
              row={row}
              tab={safeTab}
              onTabChange={setTab}
              taxes={taxes}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ChangeExhibitorStatusDialog
        fairId={fairId}
        row={row}
        open={statusOpen && !!row}
        onOpenChange={setStatusOpen}
      />
    </>
  )
}
