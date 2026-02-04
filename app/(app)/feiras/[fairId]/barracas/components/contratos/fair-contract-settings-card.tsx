"use client"

/**
 * FairContractSettingsCard
 *
 * Responsabilidade:
 * - Mostrar o estado atual do contrato principal vinculado à feira (fair.contractSettings).
 * - Exibir CTA para "Vincular/Alterar contrato".
 *
 * Decisão de UI:
 * - Criamos um "halo" em gradiente e um container interno branco para harmonizar com o layout
 *   mais colorido dos KPIs e do dashboard.
 * - Mostramos status, atualização e um ID abreviado para passar confiança de que está “selecionado”.
 */

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FileText, Link2, CheckCircle2, AlertTriangle, Clock } from "lucide-react"

type ContractTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

export type FairContractSettingsViewModel =
  | null
  | {
      id: string
      templateId: string
      updatedAt: string
      template: {
        id: string
        title: string
        status: ContractTemplateStatus
        isAddendum: boolean
        updatedAt: string
      }
    }

function shortId(id: string) {
  if (!id) return "—"
  return `${id.slice(0, 6)}…${id.slice(-4)}`
}

function formatDateTimeBR(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

export function FairContractSettingsCard(props: {
  fairName: string
  contractSettings: FairContractSettingsViewModel
  isLoading?: boolean
  onOpenDialog: () => void
}) {


  const { fairName, contractSettings, isLoading, onOpenDialog } = props

  const templateStatusBadge = useMemo(() => {
    const s = contractSettings?.template?.status
    if (!s) return null

    const map: Record<
      ContractTemplateStatus,
      { label: string; className: string }
    > = {
      DRAFT: {
        label: "Rascunho",
        className:
          "border-amber-200/80 bg-amber-50 text-amber-800 hover:bg-amber-50",
      },
      PUBLISHED: {
        label: "Publicado",
        className:
          "border-emerald-200/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
      },
      ARCHIVED: {
        label: "Arquivado",
        className:
          "border-zinc-200/80 bg-zinc-50 text-zinc-700 hover:bg-zinc-50",
      },
    }

    return map[s]
  }, [contractSettings])

  const isConfigured = Boolean(contractSettings)

  return (
    <Card className="relative overflow-hidden">
      {/* Halo em gradiente para acompanhar o visual do dashboard */}
      <div className="relative px-4">
        <div className="flex items-start justify-between ">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white/70 shadow-sm">
                <FileText className="h-5 w-5 text-zinc-700" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-zinc-900">
                   {contractSettings?.template.title ?? "Contrato da feira"} 
                  </div>

                  {isConfigured ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200/80 bg-emerald-50 text-emerald-800"
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-200/80 bg-amber-50 text-amber-800"
                    >
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      Pendente
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Configuração aplicada para todos os expositores em{" "}
                  <span className="font-medium text-foreground">{fairName}</span>
                </div>
              </div>
            </div>

            {/* Conteúdo interno
            <div className="rounded-lg border bg-white/75 p-4 shadow-sm">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              ) : contractSettings ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold text-zinc-900">
                      {contractSettings.template.title}
                    </div>

                    {templateStatusBadge ? (
                      <Badge
                        variant="outline"
                        className={cn(templateStatusBadge.className)}
                      >
                        {templateStatusBadge.label}
                      </Badge>
                    ) : null}

                    {contractSettings.template.isAddendum ? (
                      <Badge
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-800"
                      >
                        Aditivo
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-1 text-xs text-muted-foreground">
                    <div>
                      <span className="text-foreground/80">Template:</span>{" "}
                      <span className="font-mono text-[11px] text-foreground">
                        {shortId(contractSettings.templateId)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-foreground/80">Atualizado em:</span>{" "}
                      <span className="text-foreground">
                        {formatDateTimeBR(contractSettings.updatedAt)}
                      </span
                      >
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-zinc-900">
                    Nenhum contrato configurado
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vincule um template principal para habilitar envio para assinatura
                    e padronizar o documento para todos os expositores.
                  </div>
                </div>
              )}
            </div> */}
          </div>

          {/* CTA */}
          <Button
            onClick={onOpenDialog}
            className="gap-2"
            disabled={Boolean(isLoading)}
          >
            <Link2 className="h-4 w-4" />
            {contractSettings ? "Alterar contrato" : "Vincular contrato"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
