"use client"

/**
 * Modal de detalhes do interessado (Owner) no painel admin.
 *
 * Responsabilidade:
 * - Exibir dados completos do interessado para triagem.
 * - Permitir ações administrativas (ex.: liberar acesso ao portal do expositor).
 *
 * Decisões importantes:
 * - O card "Acesso ao portal" só aparece quando `interest.hasPortalLogin === false`.
 * - A ação "Gerar link" chama o endpoint admin `POST /interests/:ownerId/portal-access`.
 * - O link é temporário (30/60 min) e deve ser copiado/compartilhado pelo time interno.
 */

import React, { useEffect, useMemo, useState } from "react"

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
} from "@/app/modules/interests/interests.schema"

import { InterestFairsTab } from "./tabs/interest-fairs-tab"
import { useGrantPortalAccessMutation } from "@/app/modules/interests/interests.queries"
import type { InterestsFilters } from "@/app/modules/interests/interests.schema"

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
 * - Só renderizamos este card quando o interessado ainda NÃO tem login (hasPortalLogin=false).
 * - Exigimos e-mail cadastrado para gerar o acesso (criação do User exibidor).
 */
function PortalAccessCard({
    interest,
    filtersForInvalidate,
}: {
    interest: InterestListItem
    filtersForInvalidate: InterestsFilters
}) {
    const [expiresInMinutes, setExpiresInMinutes] = useState<30 | 60>(60)
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const canGenerate = Boolean(interest.id) && isFilled(interest.email)

    const grantMutation = useGrantPortalAccessMutation(filtersForInvalidate)

    async function handleGenerate() {
        setCopied(false)
        setGeneratedLink(null)
        setExpiresAt(null)

        const res = await grantMutation.mutateAsync({
            ownerId: interest.id,
            payload: {
                expiresInMinutes,
                type: "ACTIVATE_ACCOUNT",
            },
        })

        setGeneratedLink(res.activationLink)
        setExpiresAt(res.expiresAt)
    }

    async function handleCopy() {
        if (!generatedLink) return
        await copyToClipboard(generatedLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
    }

    return (
        <Card className="rounded-2xl border-dashed">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Acesso ao portal
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Status + alerta de pré-requisito */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/50 px-3 py-2">
                    <div className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">Status</div>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200">
                            Sem acesso
                        </Badge>
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
                                variant={expiresInMinutes === 30 ? "default" : "outline"}
                                onClick={() => setExpiresInMinutes(30)}
                                className="w-full"
                            >
                                30 min
                            </Button>

                            <Button
                                variant={expiresInMinutes === 60 ? "default" : "outline"}
                                onClick={() => setExpiresInMinutes(60)}
                                className="w-full"
                            >
                                60 min
                            </Button>

                            <Button
                                onClick={handleGenerate}
                                disabled={!canGenerate || grantMutation.isPending}
                                className="w-full"
                            >
                                {grantMutation.isPending ? "Gerando..." : "Gerar link"}
                            </Button>

                        </div>
                    </div>
                </div>

                {/* Resultado */}
                {generatedLink && (
                    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
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

                            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                                <Copy className="mr-2 h-4 w-4" />
                                {copied ? "Copiado!" : "Copiar link"}
                            </Button>
                        </div>

                        <Input readOnly value={generatedLink} className="font-mono text-xs" />
                    </div>
                )}

                {/* Feedback de erro (sem toast por enquanto, para ser auto contido) */}
                {grantMutation.isError && (
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

    // Reset de tab quando trocar o interessado (ou ao abrir)
    useEffect(() => {
        if (open) setTab("dados")
    }, [open, interest?.id])

    if (!interest) return null

    const title = interestDisplayName(interest)
    const location = interestDisplayLocation(interest)

    /**
     * Regra: o card de acesso só aparece quando explicitamente sem login.
     * Assim evitamos mostrar a ação em casos onde o backend não retornou o campo.
     */
    const shouldShowPortalAccess = interest.hasPortalLogin === false

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* overflow-hidden é crucial pro scroll ficar só no miolo */}
            <DialogContent className="max-w-7xl overflow-hidden h-[90vh] p-0 flex flex-col">
                <Tabs
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

                                    {/* Badge de acesso (só informativo) */}
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
                            {/* ✅ Ação administrativa: liberar acesso (só quando sem login) */}
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
                                    {/* Nome + Documento */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field
                                            label="Nome / Razão social"
                                            value={interestDisplayName(interest)}
                                        />
                                        <Field label="Documento" value={interest.document} mono />
                                    </div>

                                    {/* Email + Telefone */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="E-mail" value={interest.email} />
                                        <Field label="Telefone" value={interest.phone} />
                                    </div>

                                    {/* Criado / Atualizado */}
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
                                        {/* Cidade */}
                                        <div className="col-span-12 md:col-span-6">
                                            <Field label="Cidade" value={interest.addressCity} />
                                        </div>

                                        {/* CEP */}
                                        <div className="col-span-6 md:col-span-4">
                                            <Field label="CEP" value={interest.addressZipcode} mono />
                                        </div>

                                        {/* UF */}
                                        <div className="col-span-6 md:col-span-2">
                                            <Field label="UF" value={interest.addressState} />
                                        </div>

                                        {/* Endereço completo */}
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
                                        {isFilled(interest.stallsDescription) ? interest.stallsDescription : "—"}
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
