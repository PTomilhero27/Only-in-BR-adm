"use client"

/**
 * CreateExhibitorContractDialog
 *
 * Dialog para criar um contrato específico ou multi-feira para um expositor.
 * Campos: tipo, template, título, notas, feiras extras (MULTI_FAIR).
 */

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus } from "lucide-react"
import { toast } from "@/components/ui/toast"

import { useMainContractTemplatesQuery } from "@/app/modules/contratos/document-templates/document-templates.queries"
import { useCreateContractMutation, useContractDetailQuery, useDeleteContractMutation } from "@/app/modules/contratos/contracts/contracts.queries"
import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query"
import type { ContractType } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ownerFairId: string
  exhibitorName: string
  editContractId?: string | null
}

export function CreateExhibitorContractDialog({
  open,
  onOpenChange,
  ownerFairId,
  exhibitorName,
  editContractId,
}: Props) {
  const isEditing = Boolean(editContractId)
  
  const [type, setType] = React.useState<ContractType>("EXHIBITOR_SPECIFIC")
  const [templateId, setTemplateId] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [selectedFairIds, setSelectedFairIds] = React.useState<string[]>([])

  const templatesQuery = useMainContractTemplatesQuery()
  const fairsQuery = useFairsQuery({ status: "ATIVA" })
  const createMutation = useCreateContractMutation()
  const deleteMutation = useDeleteContractMutation()
  
  const detailQuery = useContractDetailQuery(editContractId || "")

  const templates = templatesQuery.data ?? []
  const availableFairs = (fairsQuery.data ?? []).filter((f) => f.id !== ownerFairId)
  const canSave = !!templateId && !!ownerFairId

  React.useEffect(() => {
    if (!open) {
      if (!isEditing) {
        setType("EXHIBITOR_SPECIFIC")
        setTemplateId("")
        setTitle("")
        setNotes("")
        setSelectedFairIds([])
      }
    }
  }, [open, isEditing])

  React.useEffect(() => {
    if (open && isEditing && detailQuery.data) {
      const data = detailQuery.data
      setType(data.type || "EXHIBITOR_SPECIFIC")
      setTemplateId(data.templateId || "")
      setTitle(data.title || "")
      setNotes(data.notes || "")
      setSelectedFairIds(data.fairLinks?.map((l) => l.fairId) || [])
    }
  }, [open, isEditing, detailQuery.data])

  async function handleCreate() {
    if (!canSave) return

    const fairIds = type === "MULTI_FAIR" ? selectedFairIds : undefined

    if (type === "MULTI_FAIR" && (!fairIds || fairIds.length === 0)) {
      toast.error({ title: "Informe ao menos uma feira extra para contrato Multi-Feira." })
      return
    }

    try {
      if (isEditing && editContractId) {
        await deleteMutation.mutateAsync(editContractId)
      }

      await createMutation.mutateAsync({
        ownerFairId,
        templateId,
        type,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        linkedFairIds: fairIds,
      })

      toast.success({ title: isEditing ? "Contrato atualizado!" : "Contrato criado com sucesso!" })
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar o contrato.")
    }
  }

  const isLoading = createMutation.isPending || deleteMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar contrato" : "Criar contrato"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Editando contrato de " : "Novo contrato para "}
            <span className="font-medium text-foreground">{exhibitorName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 overflow-y-auto flex-1 pr-2">
          {/* Tipo */}
          <div className="grid gap-1.5">
            <Label htmlFor="contract-type">Tipo do contrato</Label>
            <Select value={type} onValueChange={(v) => setType(v as ContractType)}>
              <SelectTrigger id="contract-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXHIBITOR_SPECIFIC">Específico (expositor)</SelectItem>
                <SelectItem value="MULTI_FAIR">Multi-Feira</SelectItem>
                <SelectItem value="FAIR_DEFAULT">Padrão da feira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template */}
          <div className="grid gap-1.5">
            <Label htmlFor="contract-template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="contract-template">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templatesQuery.isLoading && (
              <p className="text-xs text-muted-foreground">Carregando templates…</p>
            )}
          </div>

          {/* Título */}
          <div className="grid gap-1.5">
            <Label htmlFor="contract-title">Título customizado (opcional)</Label>
            <Input
              id="contract-title"
              placeholder="Ex: Contrato VIP - João"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
            />
          </div>

          {/* Notas */}
          <div className="grid gap-1.5">
            <Label htmlFor="contract-notes">Observações internas (opcional)</Label>
            <Textarea
              id="contract-notes"
              placeholder="Notas internas do admin…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>

          {/* Fair IDs (MULTI_FAIR) */}
          {type === "MULTI_FAIR" && (
            <div className="grid gap-2">
              <Label>Feiras extras (selecione ao menos uma)</Label>
              <ScrollArea className="h-[140px] rounded-md border p-2">
                {fairsQuery.isLoading ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Carregando feiras...
                  </div>
                ) : availableFairs.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Nenhuma outra feira ativa encontrada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableFairs.map((fair) => (
                      <label
                        key={fair.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md hover:bg-muted/50 p-1.5"
                      >
                        <Checkbox
                          checked={selectedFairIds.includes(fair.id)}
                          onCheckedChange={(checked) => {
                            setSelectedFairIds((prev) =>
                              checked
                                ? [...prev, fair.id]
                                : prev.filter((id) => id !== fair.id)
                            )
                          }}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {fair.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <p className="text-[11px] text-muted-foreground">
                Estas feiras serão vinculadas a este mesmo contrato unificado.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canSave || isLoading || (isEditing && detailQuery.isLoading)}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEditing ? "Salvar alterações" : "Criar contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
