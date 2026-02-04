"use client"

/**
 * FairContractSettingsDialog
 *
 * Responsabilidade:
 * - UI para escolher o template principal de contrato da feira.
 *
 * Fluxo real:
 * - GET /document-templates?isAddendum=false&status=PUBLISHED&mode=summary
 * - PUT /fairs/:fairId/contract-settings (upsert)
 */
import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import type { DocumentTemplateSummary } from "@/app/modules/contratos/document-templates/document-templates.schema"

export function FairContractSettingsDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void

  /**
   * Config atual (pode ser null).
   * Usamos para pré-selecionar.
   */
  currentTemplateId: string | null

  /**
   * Templates retornados do backend (summary).
   * Regra esperada: apenas isAddendum=false e status=PUBLISHED.
   */
  templates: DocumentTemplateSummary[]

  /**
   * Estados externos:
   * - carregando templates (GET)
   * - salvando vínculo (PUT)
   */
  isLoadingTemplates?: boolean
  isSaving?: boolean

  /**
   * Confirmação conectada à mutation.
   */
  onConfirm: (templateId: string) => void
}) {
  const {
    open,
    onOpenChange,
    currentTemplateId,
    templates,
    isLoadingTemplates,
    isSaving,
    onConfirm,
  } = props

  const [q, setQ] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(currentTemplateId)

  /**
   * ✅ Sempre que abrir o dialog ou mudar a configuração atual,
   * garantimos que o rádio/seleção reflita o valor correto.
   */
  useEffect(() => {
    if (!open) return
    setSelectedId(currentTemplateId)
    setQ("")
  }, [open, currentTemplateId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    // ✅ Segurança extra:
    // Mesmo que alguém passe templates errados por engano,
    // não mostramos aditivos aqui.
    const base = templates.filter((t) => !t.isAddendum)

    if (!term) return base

    return base.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term),
    )
  }, [templates, q])

  const canConfirm = Boolean(selectedId) && !isSaving

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle>Vincular contrato à feira</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Escolha o template principal que será usado por todos os expositores nesta feira.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título ou ID..."
            disabled={Boolean(isLoadingTemplates) || Boolean(isSaving)}
          />

          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
            {isLoadingTemplates ? (
              <div className="rounded-md border bg-muted/10 p-4 text-sm text-muted-foreground">
                Carregando templates...
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-md border bg-muted/10 p-4 text-sm text-muted-foreground">
                Nenhum contrato publicado encontrado.
              </div>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedId === t.id

                return (
                  <Card
                    key={t.id}
                    className={[
                      "p-3 cursor-pointer transition",
                      isSelected
                        ? "border-orange-300 ring-1 ring-orange-200"
                        : "hover:border-zinc-300",
                    ].join(" ")}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900">
                          {t.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          ID:{" "}
                          <span className="font-mono text-[11px] text-foreground">
                            {t.id}
                          </span>
                        </div>
                      </div>

                      <Badge variant="outline">{t.status}</Badge>
                    </div>
                  </Card>
                )
              })
            )}
          </div>


        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(isSaving)}
          >
            Cancelar
          </Button>

          <Button
            onClick={() => {
              if (!selectedId) return
              onConfirm(selectedId)
              onOpenChange(false)
            }}
            disabled={!canConfirm}
          >
            {isSaving ? "Salvando..." : "Salvar vínculo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
