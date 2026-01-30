"use client"

/**
 * Modal de detalhes do expositor (no contexto da feira).
 * Responsabilidade:
 * - Layout “premium” (header fixo + conteúdo rolável)
 * - Tabs: Dados (expositor) e Barracas (vinculadas)
 * - Acesso rápido para “Alterar status” (abre ChangeExhibitorStatusDialog)
 *
 * Importante:
 * - NÃO retornar antes dos hooks (evita "Rendered more hooks than during the previous render")
 */

import { useEffect, useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  CalendarDays,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Hash,
  Store,
  Users,
  Cpu,
} from "lucide-react"

import type { FairExhibitorRow, StallType } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import {
  exhibitorDisplayName,
  stallSizeLabel,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import { ChangeExhibitorStatusDialog } from "./change-exhibitor-status-dialog"

type Props = {
  fairId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  row: FairExhibitorRow | null
  initialTab?: "dados" | "barracas"
}

function isFilled(v?: string | null) {
  return Boolean(v && v.trim().length > 0)
}

function clampText(v?: string | null) {
  if (!isFilled(v)) return "—"
  return v!.trim()
}

function stallTypeLabel(type: StallType) {
  switch (type) {
    case "OPEN":
      return "Aberta"
    case "CLOSED":
      return "Fechada"
    case "TRAILER":
      return "Trailer"
    default:
      return type
  }
}

/**
 * Formata strings tipo "COMIDA_JAPONESA" ou "COMIDA-JAPONESA" para:
 * "Comida japonesa"
 */
function formatCategoryLabel(input?: string | null) {
  if (!input?.trim()) return "—"
  const normalized = input
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase()

  // primeira letra maiúscula
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

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
          <div
            className={
              mono
                ? "font-mono text-sm font-semibold truncate"
                : "text-sm font-semibold truncate"
            }
          >
            {clampText(value)}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon,
  tone = "amber",
  children,
}: {
  title: string
  icon: React.ReactNode
  tone?: "amber" | "sky" | "emerald" | "violet"
  children: React.ReactNode
}) {
  const toneLeft =
    tone === "sky"
      ? "border-l-sky-400"
      : tone === "emerald"
        ? "border-l-emerald-400"
        : tone === "violet"
          ? "border-l-violet-400"
          : "border-l-amber-400"

  const toneBg =
    tone === "sky"
      ? "bg-sky-50/40"
      : tone === "emerald"
        ? "bg-emerald-50/40"
        : tone === "violet"
          ? "bg-violet-50/40"
          : "bg-amber-50/40"

  return (
    <Card className={`rounded-2xl border-l-4 ${toneLeft} ${toneBg}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** Tile quadrado laranja claro (mesmo “clima” do print) */
function AmberSquare({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2 text-amber-900">
        <span className="opacity-80">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  )
}

export function FairExhibitorDetailsDialog({
  fairId,
  open,
  onOpenChange,
  row,
  initialTab = "dados",
}: Props) {
  const [tab, setTab] = useState<"dados" | "barracas">(initialTab)
  const [statusOpen, setStatusOpen] = useState(false)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, row?.ownerFairId, initialTab])

  const title = row ? exhibitorDisplayName(row) : "—"
  const document = row?.owner?.document ?? "—"
  const linkedCount = row?.linkedStalls?.length ?? 0

  const effectiveOpen = open && !!row

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
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as any)}
            className="flex flex-col flex-1 overflow-auto"
          >
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

                  {/* doc discreto */}
                  <div className="text-sm text-muted-foreground font-mono truncate">
                    {document}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setStatusOpen(true)}
                    disabled={!row}
                  >
                    Alterar status
                  </Button>
                </div>
              </div>

              <Separator className="mt-5" />

              <TabsList className="mt-4 grid w-full grid-cols-2">
                <TabsTrigger value="dados" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Dados
                </TabsTrigger>

                <TabsTrigger value="barracas" className="gap-2">
                  <Store className="h-4 w-4" />
                  Barracas
                </TabsTrigger>
              </TabsList>
            </DialogHeader>

            {/* CONTEÚDO */}
            <div className="h-full px-6 pt-0">
              {/* TAB 1: DADOS */}
              <TabsContent value="dados" className="mt-0 space-y-5">
                <SectionCard
                  title="Identificação e contato"
                  icon={<CalendarDays className="h-4 w-4" />}
                  tone="sky"
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <InfoTile
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Nome / Razão social"
                      value={title}
                    />
                    <InfoTile
                      icon={<Hash className="h-4 w-4" />}
                      label="Documento"
                      value={document}
                      mono
                    />
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <InfoTile
                      icon={<Mail className="h-4 w-4" />}
                      label="E-mail"
                      value={row?.owner?.email ?? null}
                    />
                    <InfoTile
                      icon={<Phone className="h-4 w-4" />}
                      label="Telefone"
                      value={row?.owner?.phone ?? null}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Endereço"
                  icon={<MapPin className="h-4 w-4" />}
                  tone="violet"
                >
                  <InfoTile
                    icon={<MapPin className="h-4 w-4" />}
                    label="Endereço completo"
                    value={row?.owner?.addressFull ?? null}
                  />
                </SectionCard>

                <SectionCard
                  title="Pagamento"
                  icon={<CreditCard className="h-4 w-4" />}
                  tone="emerald"
                >
                  <InfoTile
                    icon={<CreditCard className="h-full w-full " />}
                    label="Banco"
                    value={row?.owner?.bankName ?? null}
                  />

                  <div className="grid gap-3 md:grid-cols-2 mt-3 lg:grid-cols-2">
                    <InfoTile
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Chave Pix"
                      value={row?.owner?.pixKey ?? null}
                    />

                    <InfoTile
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Agência"
                      value={row?.owner?.bankAgency ?? null}
                      mono
                    />
                    <InfoTile
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Conta"
                      value={row?.owner?.bankAccount ?? null}
                      mono
                    />
                    <InfoTile
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Tipo de conta"
                      value={row?.owner?.bankAccountType ?? null}
                    />
                  </div>
                </SectionCard>

                <br />
              </TabsContent>

              {/* TAB 2: BARRACAS */}
              <TabsContent value="barracas" className="mt-0 space-y-5">
                <SectionCard
                  title={`Barracas vinculadas (${linkedCount})`}
                  icon={<Store className="h-4 w-4" />}
                  tone="amber"
                >
                  {linkedCount === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma barraca vinculada ainda.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {row!.linkedStalls.map((stall) => {
                        const typeLabel = stallTypeLabel(stall.stallType)
                        const sizeLabel = stallSizeLabel(stall.stallSize)
                        const categoryLabel = formatCategoryLabel(stall.mainCategory)

                        return (
                          <div
                            key={stall.id}
                            className="rounded-2xl border bg-background p-4"
                          >
                            {/* Topo: nome + (tipo formatado da categoria) */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">
                                  {stall.pdvName}
                                </div>
                              </div>

                              {/* mantém badge na direita (opcional) */}
                              <Badge variant="secondary" className="rounded-full shrink-0">
                                {categoryLabel}
                              </Badge>
                            </div>

                            <Separator className="my-3" />

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <AmberSquare
                                icon={<Store className="h-4 w-4" />}
                                label={typeLabel}
                              />
                              <AmberSquare
                                icon={<MapPin className="h-4 w-4" />}
                                label={sizeLabel}
                              />
                            </div>

                            <Separator className="my-3" />

                            <div className="flex justify-between sm:flex-row sm:items-center sm:justify-between">

                              <div className="text-sm flex flex-col">
                                <div  className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-muted-foreground text-sm " />
                                  <span className="text-muted-foreground">Banner</span>
                                </div>
                                <span className="font-semibold">
                                  {clampText(stall.bannerName ?? null)}
                                </span>
                              </div>

                              <div className="text-sm flex flex-col items-center">
                                <div className="flex items-center gap-2">
                                  <Cpu className="h-4 w-4 text-muted-foreground text-sm " />
                                  <span className="text-muted-foreground text-sm ">Maquinhas</span>
                                </div>
                                <span className="font-semibold">
                                  {String(stall.machinesQty ?? 0)}
                                </span>
                              </div>

                              <div className="text-sm flex flex-col items-center">
                                <div className="flex items-center gap-2">
                                  <Users className=" text-sm  h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm  text-muted-foreground">Equipe</span>

                                </div>
                                <span className="font-semibold">
                                  {String(stall.teamQty ?? 0)}
                                </span>
                              </div>

                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </SectionCard>

                <br />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal interno de troca de status */}
      <ChangeExhibitorStatusDialog
        fairId={fairId}
        row={row}
        open={statusOpen && !!row}
        onOpenChange={setStatusOpen}
      />
    </>
  )
}
