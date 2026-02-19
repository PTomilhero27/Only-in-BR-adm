"use client"

/**
 * ✅ FairExhibitorDetailsTabs
 *
 * Responsabilidade:
 * - Renderizar TabsList e TabsContent do modal de detalhes
 * - Manter a composição das abas em componentes separados
 *
 * Observação:
 * - Este componente é "puro": não usa effects para resetar tab.
 * - O controle de tab fica no pai (Dialog) para manter previsibilidade.
 */

import * as React from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { CalendarDays, NotebookPen, Store } from "lucide-react"

import type { FairExhibitorRow, FairTax } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import { ExhibitorObservationsTab } from "./exhibitor-observations-tab"
import { ExhibitorStallsTab } from "./tabs/exhibitor-stalls-tab"
import { ExhibitorDataTab } from "./tabs/exhibitor-data-tab"

type TabKey = "dados" | "barracas" | "observacoes"

type Props = {
  fairId: string
  row: FairExhibitorRow | null
  tab: TabKey
  onTabChange: (tab: TabKey) => void

  // ✅ NOVO
  taxes: FairTax[]
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

export function FairExhibitorDetailsTabs({ fairId, row, tab, onTabChange, taxes }: Props) {
  if (!row) return null

  const linkedCount = row.linkedStalls?.length ?? 0

  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as TabKey)} className="flex flex-col h-full">
      {/* TABS LIST */}
      <div className="px-6 pb-4 shrink-0">
        <TabsList className="mt-2 grid w-full grid-cols-3">
          <TabsTrigger value="dados" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Dados
          </TabsTrigger>

          <TabsTrigger value="barracas" className="gap-2">
            <Store className="h-4 w-4" />
            Barracas
          </TabsTrigger>

          <TabsTrigger value="observacoes" className="gap-2">
            <NotebookPen className="h-4 w-4" />
            Observações
          </TabsTrigger>
        </TabsList>

        <Separator className="mt-4" />
      </div>

      {/* CONTENT (scroll) */}
      <div className="flex-1 overflow-auto px-6 pt-0 pb-6">
        <TabsContent value="dados" className="mt-0 space-y-5">
          <ExhibitorDataTab row={row} />
        </TabsContent>

        <TabsContent value="barracas" className="mt-0 space-y-5">
          <SectionCard
            title={`Barracas vinculadas (${linkedCount})`}
            icon={<Store className="h-4 w-4" />}
            tone="amber"
          >
            {/* ✅ aqui entra a lógica de taxa por barraca */}
            <ExhibitorStallsTab fairId={fairId} row={row} taxes={taxes} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="observacoes" className="mt-0 space-y-5">
          <SectionCard title="Observações internas" icon={<NotebookPen className="h-4 w-4" />} tone="violet">
            <ExhibitorObservationsTab fairId={fairId} row={row} />
          </SectionCard>
        </TabsContent>
      </div>
    </Tabs>
  )
}
