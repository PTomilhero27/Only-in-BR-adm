"use client"

/**
 * Modal de detalhes do interessado (Owner) no painel admin.
 *
 * Responsabilidade:
 * - Exibir dados completos do interessado para triagem.
 * - Permitir ações administrativas (ex.: liberar acesso ao portal do expositor e reset de senha).
 *
 * Decisões importantes:
 * - O card "Acesso ao portal" só aparece quando `interest.hasPortalLogin` é boolean (true/false).
 *   - false => mostra ação "Gerar 1º acesso" (ACTIVATE_ACCOUNT)
 *   - true  => mostra ação "Resetar senha" (RESET_PASSWORD)
 * - As ações usam endpoints autenticados:
 *   - POST /interests/:ownerId/portal-access (ativação)
 *   - POST /interests/:ownerId/password-reset-token (atalho reset)
 *
 * Importante:
 * - O link é temporário (30/60 min) e deve ser copiado/compartilhado pelo time interno.
 * - O token raw também é exibido para facilitar suporte/WhatsApp, quando necessário.
 */

import React, { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Copy,
  Link2,
  User,
  CreditCard,
  CalendarDays,
  MapPin,
  Hash,
  AlertTriangle,
} from "lucide-react"

import {
  interestDisplayLocation,
  interestDisplayName,
  type InterestListItem,
  type InterestsFilters,
} from "@/app/modules/interests/interests.schema"

import { InterestFairsTab } from "./tabs/fairs/interest-fairs-tab"
import {
  useGrantPortalAccessMutation,
  useCreatePasswordResetTokenMutation,
} from "@/app/modules/interests/interests.queries"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  interest: InterestListItem | null

  /**
   * Filtros atuais da listagem.
   * Motivo: permitir invalidar a lista corretamente após ações (ex.: gerar link).
   */
  listFilters: InterestsFilters
}

function isFilled(v?: string | null) {
  return Boolean(v && v.trim().length > 0)
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString("pt-BR")
  } catch {
    return String(value)
  }
}

async function copyToClipboard(value?: string | null) {
  if (!value?.trim()) return
  await navigator.clipboard.writeText(value)
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm font-semibold" : "text-sm font-medium"}>
        {isFilled(value) ? value : "—"}
      </div>
    </div>
  )
}

/**
 * Card de ação "Acesso ao portal".
 *
 * Regras:
 * - Só renderizamos este card quando o backend retornou `hasPortalLogin` (boolean).
 * - Se `hasPortalLogin=false`, a ação é "Gerar 1º acesso" (ativação).
 * - Se `hasPortalLogin=true`, a ação é "Resetar senha" (gera token de reset).
 * - Exigimos e-mail cadastrado para criar/garantir a conta do portal.
 */
function PortalAccessCard({
  interest,
  filtersForInvalidate,
}: {
  interest: InterestListItem
  filtersForInvalidate: InterestsFilters
}) {
  const [expiresInMinutes, setExpiresInMinutes] = useState<30 | 60>(60)

  // ✅ Agora guardamos também o token
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  const canGenerate = Boolean(interest.id) && isFilled(interest.email)

  const grantMutation = useGrantPortalAccessMutation(filtersForInvalidate)
  const resetMutation = useCreatePasswordResetTokenMutation(filtersForInvalidate)

  // ✅ Decide modo do card com base no estado atual de acesso
  const hasAccess = interest.hasPortalLogin === true
  const mode: "ACTIVATE" | "RESET" = hasAccess ? "RESET" : "ACTIVATE"

  function resetUIState() {
    setCopiedLink(false)
    setCopiedToken(false)
    setGeneratedLink(null)
    setGeneratedToken(null)
    setExpiresAt(null)
  }

  async function handleGenerate() {
    resetUIState()

    if (mode === "ACTIVATE") {
      const res = await grantMutation.mutateAsync({
        ownerId: interest.id,
        payload: {
          expiresInMinutes,
          type: "ACTIVATE_ACCOUNT",
        },
      })

      // ✅ backend retorna token raw + link + expiresAt
      setGeneratedLink(res.activationLink)
      setGeneratedToken(res.token)
      setExpiresAt(res.expiresAt)
      return
    }

    // mode === "RESET"
    const res = await resetMutation.mutateAsync({ ownerId: interest.id })

    setGeneratedLink(res.resetUrl)
    setGeneratedToken(res.token)
    setExpiresAt(res.expiresAt)
  }

  async function handleCopyLink() {
    if (!generatedLink) return
    await copyToClipboard(generatedLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1200)
  }

  async function handleCopyToken() {
    if (!generatedToken) return
    await copyToClipboard(generatedToken)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 1200)
  }

  const isPending = grantMutation.isPending || resetMutation.isPending
  const isError = grantMutation.isError || resetMutation.isError

  return (
    <Card className="rounded-2xl border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Acesso ao portal
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status + contexto */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/50 px-3 py-2">
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Status</div>

            {mode === "ACTIVATE" ? (
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200">
                Sem acesso
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200">
                Com acesso
              </Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {isFilled(interest.email) ? (
              <span>
                E-mail do portal:{" "}
                <span className="font-medium text-foreground">{interest.email}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Sem e-mail cadastrado — preencha antes de liberar acesso
              </span>
            )}
          </div>
        </div>

        {/* Validade + ação */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Validade do link</Label>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={expiresInMinutes === 30 ? "default" : "outline"}
                onClick={() => setExpiresInMinutes(30)}
                className="w-full"
              >
                30 min
              </Button>

              <Button
                type="button"
                variant={expiresInMinutes === 60 ? "default" : "outline"}
                onClick={() => setExpiresInMinutes(60)}
                className="w-full"
              >
                60 min
              </Button>

              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || isPending}
                className="w-full"
              >
                {isPending
                  ? "Gerando..."
                  : mode === "ACTIVATE"
                    ? "Gerar 1º acesso"
                    : "Resetar senha"}
              </Button>
            </div>
          </div>
        </div>

        <div className="text-xs w-full text-muted-foreground">
          {mode === "ACTIVATE"
            ? "Gera link temporário para o expositor definir a senha no primeiro acesso."
            : "Gera link temporário para o expositor redefinir a senha."}
        </div>

        {/* Resultado */}
        {generatedLink && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">
              Link gerado{" "}
              {expiresAt ? (
                <>
                  • válido até{" "}
                  <span className="font-medium text-foreground">
                    {formatDateTime(expiresAt)}
                  </span>
                </>
              ) : null}
            </div>

            {/* Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Link</div>
                <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copiedLink ? "Copiado!" : "Copiar link"}
                </Button>
              </div>
              <Input readOnly value={generatedLink} className="font-mono text-xs" />
            </div>
          </div>
        )}

        {/* Feedback de erro */}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Não foi possível gerar o link. Verifique o backend e tente novamente.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function InterestedDetailsDialog({
  open,
  onOpenChange,
  interest,
  listFilters,
}: Props) {
  const [tab, setTab] = useState<"dados" | "bancario" | "feiras">("dados")

  /**
   * ✅ Evita setState dentro de useEffect (remove o warning do React).
   *
   * Regra:
   * - Ao abrir o modal, sempre resetamos para a aba "dados".
   * - Ao fechar, apenas propagamos o estado.
   */
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setTab("dados")
    onOpenChange(nextOpen)
  }

  if (!interest) return null

  const title = interestDisplayName(interest)
  const location = interestDisplayLocation(interest)

  const shouldShowPortalAccess = typeof interest.hasPortalLogin === "boolean"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* overflow-hidden é crucial pro scroll ficar só no miolo */}
      <DialogContent className="max-w-7xl overflow-hidden h-[90vh] p-0 flex flex-col">
        <Tabs
          key={interest.id} // ✅ trocar interessado reseta o estado interno das tabs
          value={tab}
          onValueChange={(v) => setTab(v as any)}
          className="flex flex-col flex-1 overflow-auto"
        >
          {/* HEADER FIXO */}
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-2xl leading-tight">
                  {title}
                  <Badge variant="secondary" className="ml-2 rounded-full">
                    {interest.personType}
                  </Badge>

                  {/* Badge de acesso (informativo) */}
                  {typeof interest.hasPortalLogin === "boolean" && (
                    <Badge
                      className={[
                        "ml-2 rounded-full",
                        interest.hasPortalLogin
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                          : "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200",
                      ].join(" ")}
                    >
                      {interest.hasPortalLogin ? "Com acesso" : "Sem acesso"}
                    </Badge>
                  )}
                </DialogTitle>

                <DialogDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </DialogDescription>
              </div>
            </div>

            <Separator className="mt-5" />

            {/* Tabs */}
            <TabsList className="mt-4 grid w-full grid-cols-3">
              <TabsTrigger value="dados" className="gap-2">
                <User className="h-4 w-4" />
                Dados
              </TabsTrigger>

              <TabsTrigger value="bancario" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Bancário
              </TabsTrigger>

              <TabsTrigger value="feiras" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Feiras
              </TabsTrigger>
            </TabsList>
          </DialogHeader>

          <div className="h-full px-6 pt-0">
            <TabsContent value="dados" className="mt-0 space-y-5">
              {/* ✅ Ações administrativas: 1º acesso ou reset (dependendo do estado) */}
              {shouldShowPortalAccess && (
                <PortalAccessCard interest={interest} filtersForInvalidate={listFilters} />
              )}

              {/* BLOCO 1: Identificação */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Identificação
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome / Razão social" value={interestDisplayName(interest)} />
                    <Field label="Documento" value={interest.document} mono />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="E-mail" value={interest.email} />
                    <Field label="Telefone" value={interest.phone} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                    <Field label="Criado em" value={formatDateTime(interest.createdAt)} />
                    <Field label="Atualizado em" value={formatDateTime(interest.updatedAt)} />
                  </div>
                </CardContent>
              </Card>

              {/* BLOCO 2: Endereço + Descrição */}
              <div className="space-y-5">
                <Card className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Endereço
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-6">
                      <Field label="Cidade" value={interest.addressCity} />
                    </div>

                    <div className="col-span-6 md:col-span-4">
                      <Field label="CEP" value={interest.addressZipcode} mono />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <Field label="UF" value={interest.addressState} />
                    </div>

                    <div className="col-span-12">
                      <Field label="Endereço completo" value={interest.addressFull} />
                    </div>
                  </CardContent>
                </Card>

                <div className="rounded-xl border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Descrição da(s) barraca(s)
                  </div>
                  <div className="whitespace-pre-wrap text-black text-sm">
                    {isFilled(interest.stallsDescription)
                      ? interest.stallsDescription
                      : "—"}
                  </div>
                </div>
              </div>

              <br />
            </TabsContent>

            {/* TAB 2 */}
            <TabsContent value="bancario" className="mt-0 space-y-5">
              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Dados bancários
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Pix</div>
                      <div className="mt-0.5 truncate font-mono text-sm font-semibold">
                        {isFilled(interest.pixKey) ? interest.pixKey : "—"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(interest.pixKey ?? null)}
                      disabled={!isFilled(interest.pixKey)}
                      title="Copiar Pix"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Banco" value={interest.bankName} />
                    <Field label="Agência" value={interest.bankAgency} mono />
                    <Field label="Conta" value={interest.bankAccount} mono />
                    <Field label="Tipo de conta" value={interest.bankAccountType} />
                    <Field label="Titular" value={interest.bankHolderName} />
                    <Field label="Doc. titular" value={interest.bankHolderDoc} mono />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3 */}
            <TabsContent value="feiras" className="mt-0 space-y-5">
              <InterestFairsTab interest={interest} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
