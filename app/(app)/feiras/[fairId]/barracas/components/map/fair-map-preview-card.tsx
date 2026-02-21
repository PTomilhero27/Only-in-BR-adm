/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import * as React from "react"
import Link from "next/link"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { ArrowRight, ChevronDown, MapPinned, Settings2 } from "lucide-react"

/**
 * Componente: FairMapPreviewCard (clean + funcional)
 *
 * Ajustes feitos para corrigir o erro de hidratação:
 * - AccordionTrigger é um <button> internamente (Radix).
 * - NÃO podemos colocar <Button> (outro <button>) dentro dele.
 * - Solução: botões "Visualizar/Gerenciar" ficam FORA do Trigger, no Header.
 *
 * UX:
 * - Card compacto (menor, mais clean).
 * - Sem background/preview.
 * - Accordion recolhível.
 * - Se NÃO tem mapa e NÃO está carregando: não renderiza nada.
 * - Chevron alinhado à direita (fora do trigger) e controlado via state.
 */

type FairMapTemplatePreview = {
  id: string
  title?: string | null
  elements?: Array<{ id: string; type: string }>
}

type FairMapLinkPreview = {
  stallFairId: string
  slotClientKey: string
  slotNumber?: number | null
}

type FairMapPreview = {
  id: string
  templateId: string
  templateVersionAtLink?: number | null
  template?: FairMapTemplatePreview | null
  links?: FairMapLinkPreview[] | null
}

type Props = {
  fairId: string
  fairName: string
  isLoading: boolean
  fairMap: FairMapPreview | null
  onOpenMap: () => void
  defaultOpen?: boolean
}

export function FairMapPreviewCard({
  fairId,
  fairName,
  isLoading,
  fairMap,
  onOpenMap,
  defaultOpen = false,
}: Props) {
  const hasMap = Boolean(fairMap?.id && fairMap?.templateId)

  // ✅ regra do projeto: se não tem mapa, não é pra aparecer nada
  if (!isLoading && !hasMap) return null

  const templateTitle =
    fairMap?.template?.title ?? fairMap?.templateId ?? "Template"

  const elements = fairMap?.template?.elements ?? []
  const totalSlots = elements.filter((e) => e.type === "BOOTH_SLOT").length
  const linkedSlots = fairMap?.links?.length ?? 0

  // ✅ Accordion controlado (permite o chevron fora do trigger)
  const [value, setValue] = React.useState<string>(
    defaultOpen ? "map" : "",
  )

  const isOpen = value === "map"

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <Accordion
        type="single"
        collapsible
        value={value}
        onValueChange={(v) => setValue(v ?? "")}
      >
        <AccordionItem value="map" className="border-none">
          {/* Header (sem nested button) */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            {/* Trigger apenas para o conteúdo clicável à esquerda */}
            <AccordionTrigger
              className="flex flex-1 items-center gap-3 py-0 hover:no-underline [&>svg]:hidden"
              aria-label="Alternar resumo do mapa"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-muted/30">
                <MapPinned className="h-4 w-4 opacity-80" />
              </div>

              <div className="min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">Mapa</span>

                  {isLoading ? (
                    <Badge variant="outline">Carregando</Badge>
                  ) : (
                    <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                      Configurado
                    </Badge>
                  )}

                  {!isLoading ? (
                    <>
                      <Badge variant="outline">{totalSlots} slots</Badge>
                      <Badge variant="outline">
                        {linkedSlots} vinculados
                      </Badge>
                    </>
                  ) : null}
                </div>

                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{fairName}</span>
                  <span className="mx-2">·</span>
                  <span className="truncate">{templateTitle}</span>
                </div>
              </div>
            </AccordionTrigger>

            {/* Ações (fora do trigger para não aninhar <button>) */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onOpenMap()}
                disabled={isLoading}
              >
                Visualizar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                asChild
                disabled={isLoading}
              >
                <Link href={`/feiras/${fairId}/mapa`}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Gerenciar
                </Link>
              </Button>

              {/* Chevron alinhado à direita */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                aria-label={isOpen ? "Recolher" : "Expandir"}
                onClick={() => setValue(isOpen ? "" : "map")}
              >
                <ChevronDown
                  className={[
                    "h-4 w-4 transition-transform",
                    isOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </Button>
            </div>
          </div>

          <AccordionContent className="px-4 pb-4 sm:px-5">
            {isLoading ? (
              <div className="mt-1 flex items-center gap-3 rounded-xl border bg-muted/20 p-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[220px]" />
                  <Skeleton className="h-3 w-[320px]" />
                </div>
              </div>
            ) : (
              <div className="mt-1 rounded-xl border bg-muted/10 p-4">
                <div className="text-sm font-semibold">Resumo</div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Template aplicado:{" "}
                  <span className="font-medium text-foreground">
                    {templateTitle}
                  </span>
                </div>

                {typeof fairMap?.templateVersionAtLink === "number" ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Versão vinculada:{" "}
                    <span className="font-medium text-foreground">
                      {fairMap.templateVersionAtLink}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}