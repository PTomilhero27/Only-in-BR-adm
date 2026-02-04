"use client"

/**
 * FairExhibitorContractDialog
 *
 * Responsabilidade:
 * - Exibir ações do "Contrato do expositor" dentro da feira.
 *
 * Regras:
 * - Se já existir signUrl: mostrar "Copiar link de assinatura".
 * - Se existir pdfPath e NÃO existir signUrl: mostrar "Gerar link de assinatura".
 * - Se NÃO existir pdfPath: não exibir a área de gerar link.
 * - Sempre permitir "Baixar/Visualizar contrato" (abre outra tela),
 *   mas a rota precisa de um contractId:
 *   - preferimos instance.id (Contract.id)
 *   - fallback: ownerFairId (enquanto a instância não existir)
 *
 * Observação:
 * - A geração real do link agora usa o endpoint:
 *   POST /contracts/assinafy/sign-url
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Copy, Link2, FileText, Loader2, ExternalLink } from "lucide-react"
import { useContractPreview } from "../../context/contract-preview-context"

// ✅ Ajuste: usa a mutation real do módulo contratos/assinafy
import { useCreateAssinafySignUrlMutation } from "@/app/modules/contratos/assinafy/assinafy.queries"
import { toast } from "@/components/ui/toast"


type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void

  fairId: string
  row: FairExhibitorRow | null

  /**
   * Nome/brand opcional para compor filename no backend (quando criar doc na Assinafy)
   * Se você já tem esse dado em algum lugar do row, pode remover do props.
   */
  brand?: string
}

function shortText(value: string, max = 44) {
  const v = value || ""
  if (v.length <= max) return v
  return `${v.slice(0, max - 10)}…${v.slice(-9)}`
}

function formatPtBrDateTime(iso: string) {
  try {
    const dt = new Date(iso)
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(dt)
  } catch {
    return iso
  }
}

export function FairExhibitorContractDialog({ open, onOpenChange, fairId, row, brand }: Props) {
  const router = useRouter()
  const { setPayload } = useContractPreview()

  const createSignUrlMutation = useCreateAssinafySignUrlMutation()

  const ownerFairId = row?.ownerFairId ?? null

  /**
   * ✅ Derivamos tudo do payload do backend (row.contract)
   * Estrutura esperada (baseada nos seus prints):
   * - row.contract.instance => Contract (id, pdfPath, signUrl, signUrlExpiresAt)
   */
  const contractBlock = row?.contract ?? null
  const instance = contractBlock?.instance ?? null

  // ✅ Preferência: sempre ler do Contract.instance (fonte de verdade)
  const signatureUrl = instance?.signUrl ?? contractBlock?.signUrl ?? null
  const signUrlExpiresAt = instance?.signUrlExpiresAt ?? contractBlock?.signUrlExpiresAt ?? null
  const contractPath = instance?.pdfPath ?? null

  // ✅ BUG FIX: contractId deve ser o ID do Contract (instance.id), e não templateId
  const contractId =  row?.contract.fairTemplate?.id ?? null

  const signedAt = contractBlock?.signedAt ?? null

  const canCopySignature = Boolean(signatureUrl)
  const canGenerateSignatureLink = Boolean(contractPath) && !signatureUrl

  const exhibitorName = row?.owner.fullName?.trim() || "Expositor"
  const exhibitorDoc = row?.owner.document || "—"
  const exhibitorEmail = row?.owner.email || ""

  async function handleCopySignature() {
    if (!signatureUrl) return
    await navigator.clipboard.writeText(signatureUrl)
    toast.success({title: "Link copiado para a área de transferência."})
  }

  function handleOpenSignature() {
    if (!signatureUrl) return
    window.open(signatureUrl, "_blank", "noopener,noreferrer")
  }

  function handleGoToContractPage() {
    if (!row || !ownerFairId || !contractId) return

    /**
     * ✅ Salvamos no contexto os dados do expositor/barracas
     * para preencher o contrato na próxima tela.
     */
    setPayload({
      fairId,
      ownerFairId,
      exhibitor: row,
    })

    /**
     * ✅ Rota:
     * /feiras/[fairId]/barracas/contrato/[contractId]
     */
    router.push(`/feiras/${fairId}/barracas/contrato/${contractId}`)

    // UX: fecha modal após navegar
    onOpenChange(false)
  }

  function handleGenerateLink() {
    if (!row || !ownerFairId) return
    if (!contractPath) return

    if (!exhibitorEmail) {
      toast.error({title: "Este expositor não possui e-mail cadastrado. Atualize o cadastro antes de gerar o link."})
      return
    }

    createSignUrlMutation.mutate(
      {
        input: {
          fairId,
          ownerId: row.owner.id, // ✅ Owner.id
          name: exhibitorName,
          email: exhibitorEmail,
          brand: brand?.trim() || undefined,
          // ✅ opcional: expiração (se quiser padronizar)
          // expiresAtISO: "2026-12-31T23:59:59.000Z",
        },
      },
      {
        onSuccess: async (data) => {
          // ✅ Copia automaticamente e já facilita o usuário
          await navigator.clipboard.writeText(data.signUrl)
          toast.success({title: data.reused ? "Link reutilizado e copiado!" : "Link gerado e copiado!"})

          // opcional: abrir em nova aba
          // window.open(data.signUrl, "_blank", "noopener,noreferrer")
        },
        onError: (err: any) => {
          toast.error(err?.message || "Não foi possível gerar o link de assinatura.")
        },
      }
    )
  }

  const isGeneratingLink = createSignUrlMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Contrato do expositor</DialogTitle>
          <DialogDescription>
            Ações de contrato para{" "}
            <span className="font-medium text-foreground">{exhibitorName}</span>{" "}
            <span className="text-muted-foreground">({exhibitorDoc})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Card: assinatura */}
          <Card className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-foreground">Assinatura</div>
                    <div className="text-xs text-muted-foreground">
                      Gere, abra ou copie o link para assinatura digital.
                    </div>
                  </div>
                </div>

                {signedAt ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                    Assinado em {formatPtBrDateTime(signedAt)}
                  </Badge>
                ) : canCopySignature ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                    Link disponível
                  </Badge>
                ) : canGenerateSignatureLink ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                    Pronto para gerar link
                  </Badge>
                ) : (
                  <Badge variant="outline">Aguardando contrato gerado</Badge>
                )}
              </div>

              {/* ✅ se existe link */}
              {canCopySignature ? (
                <div className="rounded-lg border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground mb-2">Link de assinatura</div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs font-mono text-foreground break-all sm:truncate">
                      {shortText(signatureUrl!, 70)}
                    </div>

                    <div className="flex gap-2 sm:shrink-0">
                      <Button type="button" variant="outline" className="gap-2" onClick={handleCopySignature}>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>

                      <Button type="button" className="gap-2" onClick={handleOpenSignature}>
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </Button>
                    </div>
                  </div>

                  {signUrlExpiresAt ? (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Expira em:{" "}
                      <span className="font-medium text-foreground">{formatPtBrDateTime(signUrlExpiresAt)}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* ✅ se pode gerar link */}
              {canGenerateSignatureLink ? (
                <div className="rounded-lg border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Contrato já gerado. Você pode gerar o link de assinatura.
                  </div>

                  <Button type="button" className="gap-2" onClick={handleGenerateLink} disabled={isGeneratingLink}>
                    {isGeneratingLink ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Gerar link de assinatura
                  </Button>
                </div>
              ) : null}

              {/* ✅ se não tem pdf ainda, não mostra área de gerar */}
              {!contractPath && !signatureUrl && !signedAt ? (
                <div className="text-xs text-muted-foreground">
                  O link de assinatura ficará disponível após o contrato ser gerado.
                </div>
              ) : null}
            </div>
          </Card>

          {/* Card: contrato */}
          <Card className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">Contrato</div>
                <div className="text-xs text-muted-foreground">
                  Baixe ou visualize o contrato completo (com dados do expositor e barracas).
                </div>
              </div>
            </div>

            <div className={cn("rounded-lg border p-3 bg-muted/10")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground break-all">
                  {contractPath ? (
                    <>
                      PDF gerado: <span className="font-mono text-foreground">{shortText(contractPath, 80)}</span>
                    </>
                  ) : (
                    <>Contrato não gerado.</>
                  )}
                </div>

                <Button type="button" className="gap-2" onClick={handleGoToContractPage} disabled={!row || !contractId}>
                  <FileText className="h-4 w-4" />
                  Baixar / visualizar
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
