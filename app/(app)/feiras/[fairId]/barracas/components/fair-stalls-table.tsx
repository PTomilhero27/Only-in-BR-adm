"use client"

/**
 * Tabela de expositores vinculados (por feira).
 * Responsabilidade:
 * - Visualização rápida de compra vs vínculo (compradas/vinculadas/tamanhos)
 * - Pagamentos (básico na linha + modal detalhado)
 * - Status do expositor + ações
 * - Estado vazio e skeleton consistentes
 *
 * Decisões desta iteração:
 * - Nova coluna "Pagamentos" (paidCount/installmentsCount)
 * - Chip de pagamento é clicável:
 *   - desktop: tooltip orienta clique
 *   - mobile: clique direto abre modal
 * - O mesmo modal é acessível via menu "..." (opção Pagamentos)
 */

import * as React from "react"
import type { FairExhibitorRow, OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { exhibitorDisplayName, ownerFairStatusLabel, stallSizeLabel } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { FairStallsRowActions } from "./fair-stalls-row-actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Mail, Phone, Link2, ShoppingBag, Ruler, CreditCard } from "lucide-react"
import { getOwnerFairStatusMeta } from "./owner-fair-status-badges"
import { ChangeExhibitorStatusDialog } from "./change-exhibitor-status-dialog"
import { FairExhibitorDetailsDialog } from "./fair-exhibitor-details-dialog"
import { ExhibitorPaymentsDialog } from "./exhibitor-payments-dialog"

type Props = {
  fairId: string
  data: FairExhibitorRow[]
  isLoading: boolean
  isError: boolean
}

function TableColGroup() {
  return (
    <colgroup>
      <col style={{ width: "10%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "14%" }} />
      <col style={{ width: "7%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "9%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "4%" }} />
    </colgroup>
  )
}


function sizesLines(slots: FairExhibitorRow["stallSlots"]) {
  if (!slots?.length) return ["Nenhum tamanho informado."]
  return slots.filter((s) => (s.qty ?? 0) > 0).map((s) => `${stallSizeLabel(s.stallSize)} · ${s.qty}`)
}

function paymentLines(row: FairExhibitorRow) {
  const p = row.payment
  if (!p) return ["Plano não configurado."]
  const next = p.nextDueDate ? new Intl.DateTimeFormat("pt-BR").format(new Date(p.nextDueDate)) : "—"
  const due = p.dueDates?.length ? p.dueDates.map((d) => new Intl.DateTimeFormat("pt-BR").format(new Date(d))).join(" · ") : "—"
  return [
    `Status: ${p.status}`,
    `Pagas: ${p.paidCount}/${p.installmentsCount}`,
    `Próxima: ${next}`,
    `Datas: ${due}`,
  ]
}

function TableSkeleton() {
  const rows = Array.from({ length: 10 })

  return (
    <Table className="table-fixed w-full">
      <TableColGroup />
      <TableHeader>
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableHead>Expositor</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-center">Compradas</TableHead>
          <TableHead className="text-center">Vinculadas</TableHead>
          <TableHead className="text-center">Tamanhos</TableHead>
          <TableHead className="text-center">Pagamentos</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="text-center">Ações</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((_, idx) => (
          <TableRow key={idx} className="hover:bg-transparent">
            <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
            <TableCell><Skeleton className="h-6 w-[140px] rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[160px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
            <TableCell className="text-center"><Skeleton className="mx-auto h-7 w-[70px] rounded-full" /></TableCell>
            <TableCell className="text-center"><Skeleton className="mx-auto h-7 w-[86px] rounded-full" /></TableCell>
            <TableCell className="text-center"><Skeleton className="mx-auto h-7 w-[110px] rounded-full" /></TableCell>
            <TableCell className="text-center"><Skeleton className="mx-auto h-7 w-[120px] rounded-full" /></TableCell>
            <TableCell className="text-center"><Skeleton className="mx-auto h-7 w-[110px] rounded-full" /></TableCell>
            <TableCell className="text-center"><Skeleton className="mx-auto h-8 w-8 rounded-md" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Chip({
  icon,
  label,
  tone = "neutral",
  tooltipTitle,
  tooltipLines,
  className,
  asButton,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  tone?: "neutral" | "success" | "warn" | "danger"
  tooltipTitle: string
  tooltipLines: string[]
  className?: string
  asButton?: boolean
  onClick?: () => void
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-muted/60 bg-muted/20 text-foreground"

  const Base = (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tabular-nums",
        "hover:bg-muted/30 transition",
        "max-w-full",
        toneClass,
        asButton ? "cursor-pointer select-none" : "cursor-default",
        className,
      )}
      onClick={asButton ? onClick : undefined}
      role={asButton ? "button" : undefined}
      tabIndex={asButton ? 0 : undefined}
    >
      <span className="opacity-80 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{Base}</TooltipTrigger>
        <TooltipContent className="max-w-[360px]">
          <div className="text-xs font-medium">{tooltipTitle}</div>
          <div className="mt-1 space-y-0.5">
            {tooltipLines.map((l, idx) => (
              <div key={idx} className="text-xs text-muted-foreground">
                {l}
              </div>
            ))}
            {asButton ? (
              <div className="text-xs mt-2 text-foreground font-medium">Clique para abrir detalhes</div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function StatusBadge({ status }: { status: OwnerFairStatus }) {
  const label = ownerFairStatusLabel(status)
  const meta = getOwnerFairStatusMeta(status)

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium border-muted/60",
        "whitespace-normal text-center leading-tight",
        "max-w-full",
        meta.className,
      )}
    >
      {label}
    </Badge>
  )
}

export function FairStallsTable({ fairId, data, isLoading, isError }: Props) {
  // ✅ Modal de status
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [statusRow, setStatusRow] = React.useState<FairExhibitorRow | null>(null)

  // ✅ Modal de detalhes
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [detailsRow, setDetailsRow] = React.useState<FairExhibitorRow | null>(null)

  // ✅ Modal de pagamentos (novo)
  const [paymentsOpen, setPaymentsOpen] = React.useState(false)
  const [paymentsRow, setPaymentsRow] = React.useState<FairExhibitorRow | null>(null)

  function handleChangeStatus(row: FairExhibitorRow) {
    setStatusRow(row)
    setStatusOpen(true)
  }

  function handleViewExhibitorDetails(row: FairExhibitorRow) {
    setDetailsRow(row)
    setDetailsOpen(true)
  }

  function handleOpenPayments(row: FairExhibitorRow) {
    setPaymentsRow(row)
    setPaymentsOpen(true)
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Modal: troca de status */}
      <ChangeExhibitorStatusDialog
        fairId={fairId}
        row={statusRow}
        open={statusOpen}
        onOpenChange={(open) => {
          setStatusOpen(open)
          if (!open) setStatusRow(null)
        }}
      />

      {/* Modal: detalhes do expositor */}
      <FairExhibitorDetailsDialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) setDetailsRow(null)
        }}
        row={detailsRow}
        fairId={fairId}
      />

      {/* ✅ Modal: pagamentos (único e reutilizado) */}
      <ExhibitorPaymentsDialog
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
        fairId={fairId}
        ownerFairId={paymentsRow?.ownerFairId ?? null}
      />


      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Expositores vinculados</div>
          <div className="text-xs text-muted-foreground">
            {isLoading
              ? "Carregando…"
              : isError
                ? "Não foi possível carregar. Verifique o backend e tente novamente."
                : `${data.length} registro(s) nesta lista.`}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="px-1">
          <TableSkeleton />
        </div>
      ) : (
        <div className="px-1">
          <Table className="table-fixed w-full">
            <TableColGroup />

            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead>Expositor</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Compradas</TableHead>
                <TableHead className="text-center">Vinculadas</TableHead>
                <TableHead className="text-center">Tamanhos</TableHead>
                <TableHead className="text-center">Pagamentos</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((row) => {
                const name = exhibitorDisplayName(row)

                const purchased = row.stallsQtyPurchased
                const linked = row.stallsQtyLinked
                const complete = purchased > 0 && linked >= purchased
                const linkedTone = complete ? "success" : linked > 0 ? "warn" : "neutral"

                const sizesCount = row.stallSlots?.filter((s) => (s.qty ?? 0) > 0).length ?? 0
                const sizesLabel = sizesCount === 0 ? "—" : `${sizesCount} tipo(s)`

                const phone = row.owner.phone?.trim() || "—"
                const email = row.owner.email?.trim() || "—"

                const payment = row.payment
                const hasPayment = !!payment
                const paymentsLabel = !payment ? "—" : `${payment.paidCount}/${payment.installmentsCount}`

                const paymentsTone =
                  !payment
                    ? "neutral"
                    : payment.status === "PAID"
                      ? "success"
                      : payment.status === "OVERDUE"
                        ? "danger"
                        : payment.status === "PARTIALLY_PAID"
                          ? "warn"
                          : "neutral"

                return (
                  <TableRow key={row.ownerFairId} className="transition hover:bg-muted/30">
                    <TableCell className="min-w-0">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {name}{" "}
                          <span className="text-muted-foreground font-normal">{row.owner.personType}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-sm text-muted-foreground truncate">
                      {row.owner.document ?? "—"}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="h-4 w-4 opacity-70 shrink-0" />
                        <span className="truncate">{phone}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-4 w-4 opacity-70 shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Chip
                        icon={<ShoppingBag className="h-3.5 w-3.5" />}
                        label={`${purchased}`}
                        tooltipTitle="Barracas compradas"
                        tooltipLines={[`Total comprado nesta feira: ${purchased}`]}
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <Chip
                        icon={<Link2 className="h-3.5 w-3.5" />}
                        label={`${linked}/${purchased}`}
                        tooltipTitle="Barracas vinculadas"
                        tooltipLines={[
                          `Vinculadas: ${linked}`,
                          `Compradas: ${purchased}`,
                          complete ? "✅ Expositor já vinculou tudo." : "⏳ Ainda faltam vínculos.",
                        ]}
                        tone={linkedTone}
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <Chip
                        icon={<Ruler className="h-3.5 w-3.5" />}
                        label={sizesLabel}
                        tooltipTitle="Tamanhos comprados"
                        tooltipLines={sizesLines(row.stallSlots)}
                      />
                    </TableCell>

                    {/* ✅ Pagamentos: chip clicável + tooltip */}
                    <TableCell className="text-center">
                      <Chip
                        icon={<CreditCard className="h-3.5 w-3.5" />}
                        label={paymentsLabel}
                        tooltipTitle="Pagamentos"
                        tooltipLines={paymentLines(row)}
                        tone={paymentsTone as any}
                        asButton={hasPayment}
                        onClick={() => handleOpenPayments(row)}
                        className={!hasPayment ? "opacity-70" : ""}
                      />
                    </TableCell>

                    <TableCell className="text-center min-w-0">
                      <StatusBadge status={row.status} />
                    </TableCell>

                    <TableCell className="text-center">
                      <FairStallsRowActions
                        row={row}
                        onViewExhibitorDetails={handleViewExhibitorDetails}
                        onChangeStatus={handleChangeStatus}
                        onOpenPayments={handleOpenPayments}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}

              {!isError && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center">
                    <div className="text-sm font-medium">Nenhum expositor encontrado</div>
                    <div className="text-xs text-muted-foreground">Tente alterar os filtros de busca.</div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
