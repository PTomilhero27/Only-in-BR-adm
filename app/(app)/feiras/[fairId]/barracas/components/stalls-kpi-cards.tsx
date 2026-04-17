"use client";

import { CheckCircle2, HandCoins, Layers3, Store, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema";
import { OwnerFairStatusCountBadge } from "./table/owner-fair-status-badges";

export function StallsKpiCards({
  kpis,
}: {
  kpis: {
    purchased: number;
    linked: number;
    stallsCapacity?: number | null;
    exhibitors: number;
    exhibitorsLimit?: number | null;
    doneExhibitors: number;
    statusCounts: Record<OwnerFairStatus, number>;
    totalSoldCents: number;
    totalPaidCents: number;
    totalOpenCents: number;
    overdueOpenCents: number;
  };
}) {
  const stallsCap = kpis.stallsCapacity ?? null;
  const donePct =
    kpis.exhibitors > 0 ? Math.min(1, kpis.doneExhibitors / kpis.exhibitors) : 0;
  const paidPct =
    kpis.totalSoldCents > 0 ? Math.min(1, kpis.totalPaidCents / kpis.totalSoldCents) : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.1fr_1.25fr_1fr_1fr]">
      <CompactCard
        title="Capacidade"
        icon={<Layers3 className="h-4 w-4" />}
        accentClassName="bg-[color:var(--brand-blue)]"
      >
        <CompactMetric
          icon={<Store className="h-4 w-4" />}
          label="Barracas"
          value={`${kpis.linked}/${stallsCap ?? kpis.linked}`}
        />
        <CompactMetric
          icon={<Users className="h-4 w-4" />}
          label="Expositores"
          value={String(kpis.exhibitors)}
        />
      </CompactCard>

      <CompactCard
        title="Status"
        icon={<Users className="h-4 w-4" />}
        accentClassName="bg-[color:var(--brand-pink)]"
      >
        <div className="flex flex-col gap-1.5">
          <OwnerFairStatusCountBadge
            status="SELECIONADO"
            count={kpis.statusCounts.SELECIONADO ?? 0}
            className="w-full justify-between rounded-md"
          />
          <OwnerFairStatusCountBadge
            status="AGUARDANDO_PAGAMENTO"
            count={kpis.statusCounts.AGUARDANDO_PAGAMENTO ?? 0}
            className="w-full justify-between rounded-md"
          />
          <OwnerFairStatusCountBadge
            status="AGUARDANDO_ASSINATURA"
            count={kpis.statusCounts.AGUARDANDO_ASSINATURA ?? 0}
            className="w-full justify-between rounded-md"
          />
          <OwnerFairStatusCountBadge
            status="CONCLUIDO"
            count={kpis.statusCounts.CONCLUIDO ?? 0}
            className="w-full justify-between rounded-md"
          />
        </div>
      </CompactCard>

      <CompactCard
        title="Financeiro"
        icon={<HandCoins className="h-4 w-4" />}
        accentClassName="bg-[color:var(--brand-yellow)]"
      >
        <div className="space-y-2">
          <div className="text-2xl font-semibold text-primary">
            {formatMoneyBRLFromCents(kpis.totalPaidCents)}
          </div>
          <div className="text-sm text-primary/56">
            de {formatMoneyBRLFromCents(kpis.totalSoldCents)}
          </div>
          <ProgressLine value={paidPct} />
          <div className="flex items-center justify-between text-sm text-primary/56">
            <span>Em aberto</span>
            <span>{formatMoneyBRLFromCents(kpis.totalOpenCents)}</span>
          </div>
        </div>
      </CompactCard>

      <CompactCard
        title="Concluídos"
        icon={<CheckCircle2 className="h-4 w-4" />}
        accentClassName="bg-[color:var(--brand-green)]"
      >
        <div className="space-y-3">
          {/* Ratio + percentage em linha */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-semibold leading-none text-primary">
                {kpis.doneExhibitors}
              </span>
              <span className="text-xl font-normal text-primary/32">/{kpis.exhibitors}</span>
            </div>
            <div className="rounded-full bg-[color:var(--brand-green)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--brand-green)]">
              {Math.round(donePct * 100)}%
            </div>
          </div>
          {/* Progress bar com label */}
          <div className="space-y-1">
            <div className="text-xs text-primary/48">Expositores finalizados</div>
            <ProgressLine value={donePct} color="var(--brand-green)" />
          </div>
          {/* Barracas vinculadas */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/32 px-3 py-2">
            <span className="text-xs text-primary/58">Barracas vinculadas</span>
            <span className="font-display text-sm font-semibold text-[color:var(--brand-green)]">
              {kpis.linked}/{kpis.purchased}
            </span>
          </div>
        </div>
      </CompactCard>
    </div>
  );
}

function CompactCard({
  title,
  icon,
  accentClassName,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accentClassName: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border bg-white py-0 shadow-[0_18px_38px_-36px_rgba(1,0,119,0.12)]">
      <div className={`h-1 ${accentClassName}`} />
      <div className="space-y-3 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="font-display text-base text-primary">{title}</div>
          <div className="text-primary/34">{icon}</div>
        </div>
        {children}
      </div>
    </Card>
  );
}

function CompactMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/32 px-3 py-2">
      <div className="flex items-center gap-2 text-primary/58">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-display text-base text-primary">{value}</span>
    </div>
  );
}

function ProgressLine({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
        style={{
          width: `${pct * 100}%`,
          ...(color ? { backgroundColor: color } : {}),
        }}
      />
    </div>
  );
}

function formatMoneyBRLFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}
