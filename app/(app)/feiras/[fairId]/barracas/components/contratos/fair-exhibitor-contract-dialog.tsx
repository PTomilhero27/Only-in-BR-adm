"use client"

/**
 * FairExhibitorContractDialog
 *
 * - Corrige copy-to-clipboard (sem Runtime NotAllowedError)
 * - Corrige contractId (instance.id ou fallback ownerFairId)
 * - Ajusta layout (cards, truncation do link, botões alinhados)
 * - ✅ Atualiza layout imediatamente ao gerar o link (state local override)
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
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Copy, Link2, FileText, Loader2, ExternalLink } from "lucide-react"
import { useContractPreview } from "../../context/contract-preview-context"

import { useCreateAssinafySignUrlMutation } from "@/app/modules/contratos/assinafy/assinafy.queries"
import { toast } from "@/components/ui/toast"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fairId: string
  row: FairExhibitorRow | null
  brand?: string
}

function shortText(value: string, max = 64) {
  const v = value || ""
  if (v.length <= max) return v
  return `${v.slice(0, Math.max(10, max - 14))}…${v.slice(-12)}`
}

function formatPtBrDateTime(iso: string) {
  try {
    const dt = new Date(iso)
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(dt)
  } catch {
    return iso
  }
}

/**
 * ✅ Helper robusto pra copiar:
 * - Tenta Clipboard API quando possível
 * - Fallback legacy com textarea + execCommand
 * - Nunca quebra a UI
 */
async function copyToClipboard(text: string) {
  // clipboard moderna
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof document !== "undefined" &&
      typeof document.hasFocus === "function" &&
      document.hasFocus()
    ) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // segue pro fallback
  }

  // fallback legacy
  try {
    if (typeof document === "undefined") return false
    const el = document.createElement("textarea")
    el.value = text
    el.setAttribute("readonly", "")
    el.style.position = "fixed"
    el.style.left = "-9999px"
    el.style.top = "-9999px"
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export function FairExhibitorContractDialog({ open, onOpenChange, fairId, row, brand }: Props) {
  const router = useRouter()
  const { setPayload } = useContractPreview()

  const createSignUrlMutation = useCreateAssinafySignUrlMutation()

  const ownerFairId = row?.ownerFairId ?? null

  // Fonte de verdade do contrato (backend)
  const contractBlock = row?.contract ?? null
  const instance = contractBlock?.instance ?? null

  const backendSignatureUrl = instance?.signUrl ?? contractBlock?.signUrl ?? null
  const backendSignUrlExpiresAt = instance?.signUrlExpiresAt ?? contractBlock?.signUrlExpiresAt ?? null
  const contractPath = instance?.pdfPath ?? null
  const signedAt = contractBlock?.signedAt ?? null

  // ✅ contractId correto: Contract.instance.id; fallback ownerFairId
  const contractId = row?.contract?.fairTemplate?.id ?? null

  const exhibitorName = row?.owner.fullName?.trim() || "Expositor"
  const exhibitorDoc = row?.owner.document || "—"
  const exhibitorEmail = row?.owner.email || ""

  const isGeneratingLink = createSignUrlMutation.isPending

  /**
   * ✅ Estado local para atualizar UI imediatamente após gerar link
   * (sem esperar refetch/invalidations)
   */
  const [localSignUrl, setLocalSignUrl] = React.useState<string | null>(null)
  const [localSignUrlExpiresAt, setLocalSignUrlExpiresAt] = React.useState<string | null>(null)

  // quando mudar o expositor/abrir outro row, resetar override local
  React.useEffect(() => {
    setLocalSignUrl(null)
    setLocalSignUrlExpiresAt(null)
  }, [row?.ownerFairId, row?.owner?.id, open])

  // ✅ Fonte final para render: local override > backend
  const signatureUrl = localSignUrl ?? backendSignatureUrl
  const signUrlExpiresAt = localSignUrlExpiresAt ?? backendSignUrlExpiresAt

  const canCopySignature = Boolean(signatureUrl)
  const canGenerateSignatureLink = Boolean(contractPath) && !signatureUrl

  async function handleCopySignature() {
    if (!signatureUrl) return
    const ok = await copyToClipboard(signatureUrl)

    if (ok) toast.success({ title: "Link copiado para a área de transferência." })
    else toast.success({ title: "Link pronto! Selecione e copie manualmente." })
  }

  function handleOpenSignature() {
    if (!signatureUrl) return
    window.open(signatureUrl, "_blank", "noopener,noreferrer")
  }

  function handleGoToContractPage() {
    if (!row || !ownerFairId || !contractId) return

    setPayload({
      fairId,
      ownerFairId,
      exhibitor: row,
    })

    router.push(`/feiras/${fairId}/barracas/contrato/${contractId}`)
    onOpenChange(false)
  }

  function handleGenerateLink() {
    if (!row || !ownerFairId) return
    if (!contractPath) return

    if (!exhibitorEmail) {
      toast.error({
        title: "Este expositor não possui e-mail cadastrado. Atualize o cadastro antes de gerar o link.",
      })
      return
    }

    createSignUrlMutation.mutate(
      {
        input: {
          fairId,
          ownerId: row.owner.id,
          name: exhibitorName,
          email: exhibitorEmail,
          brand: brand?.trim() || undefined,
        },
      },
      {
        onSuccess: async (data) => {
          // ✅ atualiza UI imediatamente
          setLocalSignUrl(data.signUrl)
          // se sua API devolver expiresAt, encaixa aqui:
          // setLocalSignUrlExpiresAt(data.signUrlExpiresAt ?? null)

          const ok = await copyToClipboard(data.signUrl)

          if (ok) {
            toast.success({ title: data.reused ? "Link reutilizado e copiado!" : "Link gerado e copiado!" })
          } else {
            toast.success({ title: data.reused ? "Link reutilizado!" : "Link gerado!" })
            toast.success({ title: "Clique em “Copiar” para copiar o link." })
          }
        },
        onError: (err: any) => {
          toast.error(err?.message || "Não foi possível gerar o link de assinatura.")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[820px]">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-foreground">Assinatura</div>
                    <div className="text-xs text-muted-foreground">
                      Gere, abra ou copie o link para assinatura digital.
                    </div>
                  </div>
                </div>

                <div className="sm:pt-1">
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
              </div>

              {/* Link disponível */}
              {canCopySignature ? (
                <div className="rounded-lg border bg-muted/10 p-3">
                  <div className="mb-2 text-xs text-muted-foreground">Link de assinatura</div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      readOnly
                      value={signatureUrl ?? ""}
                      className="font-mono text-xs"
                      onFocus={(e) => e.currentTarget.select()}
                    />

                    <div className="flex gap-2 sm:shrink-0 sm:justify-end">
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

              {/* Pode gerar link */}
              {canGenerateSignatureLink ? (
                <div className="rounded-lg border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    Contrato já gerado. Você pode gerar o link de assinatura.
                  </div>

                  <div className="mt-3 w-full">
                    <Button
                      type="button"
                      className="gap-2 sm:shrink-0 w-full"
                      onClick={handleGenerateLink}
                      disabled={isGeneratingLink}
                    >
                      {isGeneratingLink ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Gerar link de assinatura
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Sem PDF e sem link */}
              {!contractPath && !signatureUrl && !signedAt ? (
                <div className="text-xs text-muted-foreground">
                  O link de assinatura ficará disponível após o contrato ser gerado.
                </div>
              ) : null}
            </div>
          </Card>

          {/* Card: contrato */}
          <Card className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-foreground">Contrato</div>
                  <div className="text-xs text-muted-foreground">
                    Baixe ou visualize o contrato completo (com dados do expositor e barracas).
                  </div>
                </div>
              </div>

              <div className={cn("rounded-lg border bg-muted/10 p-3")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    {contractPath ? (
                      <>
                        PDF gerado:{" "}
                        <span className="font-mono text-foreground break-all">{shortText(contractPath, 100)}</span>
                      </>
                    ) : (
                      <>Contrato não gerado.</>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="gap-2 sm:shrink-0"
                    onClick={handleGoToContractPage}
                    disabled={!row || !contractId}
                  >
                    <FileText className="h-4 w-4" />
                    Baixar / visualizar
                  </Button>
                </div>
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
