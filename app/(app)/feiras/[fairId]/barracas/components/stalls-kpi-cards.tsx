"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import {
  Layers3,
  Users,
  CheckCircle2,
  Store,
  ChevronDown,
  HandCoins,
} from "lucide-react"
import { OwnerFairStatusCountBadge } from "./table/owner-fair-status-badges"

/**
 * Cards de KPI do dashboard de barracas.
 * Responsabilidade:
 * - Mostrar uma visão rápida e fácil de entender (sem excesso de texto)
 * - Consolidar indicadores de capacidade, status, conclusão e financeiro
 *
 * Decisões:
 * - Mantemos layout de "cards accordion" para reduzir ruído visual
 * - O estado de abrir/fechar é global (abrir 1 abre todos / fechar 1 fecha todos)
 * - Valores financeiros são recebidos já agregados em cents (inteiros), evitando problemas de float
 *
 * Ajustes desta iteração (UI):
 * - Grid em 3 colunas (fica menos largo e mais equilibrado)
 * - Cards com altura mínima controlada (evita “esticado”)
 * - Espaçamentos internos reduzidos (mais compacto e menos “vazio”)
 * - Financeiro com hero menor + rows mais compactas
 */
export function StallsKpiCards({
  kpis,
}: {
  kpis: {
    purchased: number
    linked: number
    stallsCapacity?: number | null

    exhibitors: number
    exhibitorsLimit?: number | null

    doneExhibitors: number
    statusCounts: Record<OwnerFairStatus, number>

    // ✅ financeiro
    totalSoldCents: number
    totalPaidCents: number
    totalOpenCents: number
    overdueOpenCents: number
  }
}) {
  const stallsCap = kpis.stallsCapacity ?? null
  const exhibitorsCap = kpis.exhibitorsLimit ?? null

  const stallsLabel = stallsCap ? `${kpis.linked}/${stallsCap}` : `${kpis.linked}`
  const exhibitorsLabel = exhibitorsCap
    ? `${kpis.exhibitors}/${exhibitorsCap}`
    : `${kpis.exhibitors}`

  const donePct =
    kpis.exhibitors > 0 ? Math.min(1, kpis.doneExhibitors / kpis.exhibitors) : 0
  const donePctLabel = kpis.exhibitors > 0 ? `${Math.round(donePct * 100)}%` : "—"

  /**
   * Estado global do "accordion".
   * Regra: se fechar 1, fecha todos. Se abrir 1, abre todos.
   */
  const [openAll, setOpenAll] = useState(true)

  // ✅ Financeiro (em cents)
  const soldCents = kpis.totalSoldCents ?? 0
  const paidCents = kpis.totalPaidCents ?? 0
  const openCents = kpis.totalOpenCents ?? Math.max(0, soldCents - paidCents)
  const overdueCents = kpis.overdueOpenCents ?? 0

  const paidPct = soldCents > 0 ? Math.min(1, paidCents / soldCents) : 0
  const paidPctLabel = soldCents > 0 ? `${Math.round(paidPct * 100)}%` : "—"

  return (
    // ✅ 3 colunas em telas grandes (menos largo / mais equilibrado)
    <div className="grid gap-4 lg:grid-cols-4">
      {/* 1) Capacidade */}
      <AccordionKpiCard
        accent="blue"
        title="Capacidade da feira"
        icon={<Layers3 className="h-4 w-4" />}
        isOpen={openAll}
        onToggle={() => setOpenAll((v) => !v)}
      >
        <div className="space-y-2">
          <MiniStat
            icon={<Store className="h-4 w-4" />}
            label="Barracas vinculadas"
            value={stallsLabel}
          />

          <MiniStat
            icon={<Users className="h-4 w-4" />}
            label="Expositores vinculados"
            value={exhibitorsLabel}
          />

          <MiniStat
            icon={<Store className="h-4 w-4" />}
            label="Capacidade (barracas)"
            value={stallsCap ? `${stallsCap}` : "—"}
            sub="limite de barracas nesta feira"
          />
        </div>
      </AccordionKpiCard>

      {/* 2) Status */}
      <AccordionKpiCard
        accent="purple"
        title="Status dos expositores"
        icon={<Users className="h-4 w-4" />}
        isOpen={openAll}
        onToggle={() => setOpenAll((v) => !v)}
      >
        <div className="space-y-2">
          <OwnerFairStatusCountBadge
            status="SELECIONADO"
            count={kpis.statusCounts.SELECIONADO ?? 0}
            className="w-full justify-between"
          />
          <OwnerFairStatusCountBadge
            status="AGUARDANDO_PAGAMENTO"
            count={kpis.statusCounts.AGUARDANDO_PAGAMENTO ?? 0}
            className="w-full justify-between"
          />
          <OwnerFairStatusCountBadge
            status="AGUARDANDO_ASSINATURA"
            count={kpis.statusCounts.AGUARDANDO_ASSINATURA ?? 0}
            className="w-full justify-between"
          />
          <OwnerFairStatusCountBadge
            status="CONCLUIDO"
            count={kpis.statusCounts.CONCLUIDO ?? 0}
            className="w-full justify-between"
          />
        </div>
      </AccordionKpiCard>

      {/* 4) Financeiro */}
      <AccordionKpiCard
        accent="orange"
        title="Financeiro"
        icon={<HandCoins className="h-4 w-4" />}
        isOpen={openAll}
        onToggle={() => setOpenAll((v) => !v)}
      >
        {/* ✅ Mais compacto: menos espaço vertical */}
        <div className="space-y-4">
          {/* HERO compacto */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Recebido</div>

            <div className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatMoneyBRLFromCents(paidCents)}
            </div>

            <div className="text-xs text-muted-foreground">
              {paidPctLabel} do total ({formatMoneyBRLFromCents(soldCents)})
            </div>
          </div>

          {/* PROGRESSO compacto */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pago</span>
              <span className="tabular-nums">
                {formatMoneyBRLFromCents(paidCents)} / {formatMoneyBRLFromCents(soldCents)}
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground/70 transition-all"
                style={{ width: `${paidPct * 100}%` }}
              />
            </div>
          </div>


        </div>
      </AccordionKpiCard>

      {/* 3) Concluídos */}
      <AccordionKpiCard
        accent="emerald"
        title="Concluídos"
        icon={<CheckCircle2 className="h-4 w-4" />}
        isOpen={openAll}
        onToggle={() => setOpenAll((v) => !v)}
      >
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-3xl tracking-tight font-semibold">
                {kpis.doneExhibitors}
                <span className="text-muted-foreground">/{kpis.exhibitors}</span>
              </div>
              <div className="text-xs text-muted-foreground">expositores finalizados</div>
            </div>

            <div className="text-sm font-medium text-muted-foreground">{donePctLabel}</div>
          </div>

          <SlimProgress value={donePct} />

          <MiniStatCompact
            label="Barracas"
            sub="vinculadas / compradas"
            value={`${kpis.linked}/${kpis.purchased}`}
          />
        </div>
      </AccordionKpiCard>


    </div>
  )
}

/**
 * Formata centavos para BRL.
 * Mantemos aqui para o KPI ser auto-suficiente e evitar “contrato implícito” com outras libs.
 */
function formatMoneyBRLFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100)
}

/**
 * Linha de estatística "limpa" para o Financeiro.
 * Responsabilidade:
 * - Dar clareza ao label/valor sem virar uma lista apertada.
 * - Quando danger=true, destacamos com cor/contorno de alerta.
 *
 * Ajuste desta iteração:
 * - padding menor (px-3 py-2) para reduzir altura geral
 */
function StatRow({
  label,
  value,
  sub,
  danger,
}: {
  label: string
  value: string
  sub?: string
  danger?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-3 py-2",
        "bg-muted/10",
        danger ? "border-destructive/40 text-destructive" : "",
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        {sub ? <div className="text-xs text-muted-foreground truncate">{sub}</div> : null}
      </div>

      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

/**
 * Mini card ainda mais compacto para caber no KPI sem aumentar altura.
 * Uso: comparativos rápidos (ex.: vinculadas/compradas).
 */
function MiniStatCompact({
  label,
  sub,
  value,
}: {
  label: string
  sub?: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-muted/10 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{label}</div>
        {sub ? <div className="text-[11px] text-muted-foreground truncate">{sub}</div> : null}
      </div>

      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

/**
 * Card que abre/fecha clicando no header inteiro.
 * Regra:
 * - o estado é controlado externamente (isOpen)
 * - clicar em qualquer card alterna "todos"
 *
 * Ajustes desta iteração:
 * - min-h controlado para evitar cards “esticados”
 * - padding do header reduzido (mais compacto)
 */
function AccordionKpiCard({
  title,
  icon,
  accent,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  accent: "blue" | "purple" | "emerald" | "orange"
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card
      className={cn(
        "border-muted/60 shadow-sm",
        "w-full", // ✅ controla altura para evitar “esticado”
        accentBorderClass(accent),
      )}
    >
      <CardHeader
        className="pb-1 pt-4 select-none cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle()
        }}
        title={isOpen ? "Clique para recolher" : "Clique para expandir"}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">{title}</span>

          <span className="flex items-center gap-2 text-muted-foreground/70">
            {icon}

            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </span>
        </CardTitle>
      </CardHeader>

      {isOpen ? <CardContent className="pt-2">{children}</CardContent> : null}
    </Card>
  )
}

function accentBorderClass(accent: "blue" | "purple" | "emerald" | "orange") {
  switch (accent) {
    case "blue":
      return "border-l-4 border-l-blue-400/70"
    case "purple":
      return "border-l-4 border-l-purple-400/70"
    case "emerald":
      return "border-l-4 border-l-emerald-400/70"
    case "orange":
      return "border-l-4 border-l-orange-400/70"
    default:
      return ""
  }
}

/**
 * Mini card interno (alinhamento padrão):
 * [ícone + texto/subtexto] .......... [valor]
 */
function MiniStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground/80">{icon}</span>

        <div className="min-w-0">
          <div className="text-xs font-medium text-foreground truncate">{label}</div>
          {sub ? <div className="text-[11px] text-muted-foreground truncate">{sub}</div> : null}
        </div>
      </div>

      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function SlimProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value))

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-foreground/70" style={{ width: `${pct * 100}%` }} />
    </div>
  )
}
