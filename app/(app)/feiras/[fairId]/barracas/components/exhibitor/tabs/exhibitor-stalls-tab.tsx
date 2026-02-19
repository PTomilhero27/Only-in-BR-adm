"use client"

/**
 * ✅ ExhibitorStallsTab
 *
 * - Lista barracas vinculadas
 * - Permite trocar taxa SEM travar
 * - ✅ Optimistic UI + toast + invalidate
 */

import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Cpu, MapPin, Store, Users } from "lucide-react"

import type {
  FairExhibitorRow,
  FairTax,
  StallType,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { stallSizeLabel } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import { usePatchStallFairTaxMutation } from "@/app/modules/interest-fairs/interest-fairs.queries"
import {
  clampText,
  formatCategoryLabel,
  stallTypeLabel,
} from "../fair-exhibitor-details-dialog"
import { toast } from "@/components/ui/toast"

type Props = {
  fairId: string
  row: FairExhibitorRow | null
  taxes: FairTax[]
}

function bpsToPercentLabel(bps: number) {
  const v = (bps / 100).toFixed(2).replace(".", ",")
  return `${v}%`
}

function AmberSquare({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2 text-amber-900">
        <span className="opacity-80">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  )
}

export function ExhibitorStallsTab({ fairId, row, taxes }: Props) {
  /**
   * ✅ Hooks SEMPRE no topo (sem return antes) => sem warning
   */
  const qc = useQueryClient()
  const ownerId = row?.owner?.id ?? "__no_owner__"
  const patchTax = usePatchStallFairTaxMutation(ownerId, fairId)

  const activeTaxes = useMemo(() => {
    return (Array.isArray(taxes) ? taxes : []).filter((t) => t.isActive)
  }, [taxes])

  /**
   * ✅ Optimistic overrides:
   * Se você troca, já reflete no Select e no label antes do refetch.
   */
  const [taxOverrideByStallFairId, setTaxOverrideByStallFairId] = useState<Record<string, string>>({})

  const linked = row?.linkedStalls ?? []
  if (!row) return null
  if (linked.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhuma barraca vinculada ainda.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {linked.map((stall) => {
        const stallFairId = stall.stallFairId

        const typeLabel = stallTypeLabel(stall.stallType as StallType)
        const sizeLabel = stallSizeLabel(stall.stallSize)
        const categoryLabel = formatCategoryLabel(stall.mainCategory)

        const currentTax = stall.tax ?? null

        const overrideTaxId = stallFairId ? taxOverrideByStallFairId[stallFairId] : undefined
        const selectedTaxId = overrideTaxId ?? currentTax?.id ?? ""

        const selectedTax =
          activeTaxes.find((t) => t.id === selectedTaxId) ??
          (currentTax
            ? { id: currentTax.id, name: currentTax.name ?? "Taxa", percentBps: currentTax.percentBps ?? null }
            : null)

        const isDisabled =
          !row.owner?.id ||
          !stallFairId ||
          activeTaxes.length === 0 ||
          patchTax.isPending

        return (
          <div key={stallFairId} className="rounded-2xl border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{stall.pdvName}</div>
              </div>

              <Badge variant="secondary" className="rounded-full shrink-0">
                {categoryLabel}
              </Badge>
            </div>

            <Separator className="my-3" />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AmberSquare icon={<Store className="h-4 w-4" />} label={typeLabel} />
              <AmberSquare icon={<MapPin className="h-4 w-4" />} label={sizeLabel} />
            </div>

            <Separator className="my-3" />

            {/* ✅ Taxa (pode trocar sempre) */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <div className="text-muted-foreground">Taxa de vendas</div>

                {selectedTax ? (
                  <div className="font-semibold">
                    {selectedTax.name ?? "Taxa"}{" "}
                    {typeof selectedTax.percentBps === "number"
                      ? `(${bpsToPercentLabel(selectedTax.percentBps)})`
                      : ""}
                  </div>
                ) : (
                  <div className="text-amber-900 font-semibold">Nenhuma taxa definida</div>
                )}
              </div>

              <div className="w-full sm:w-[320px]">
                <Select
                  value={selectedTaxId}
                  disabled={isDisabled}
                  onValueChange={(taxId) => {
                    if (!row.owner?.id) return
                    if (!stallFairId) return

                    const prev = selectedTaxId

                    // ✅ optimistic: muda já
                    setTaxOverrideByStallFairId((s) => ({ ...s, [stallFairId]: taxId }))

                    patchTax.mutate(
                      { stallFairId, taxId },
                      {
                        onSuccess: async () => {
                          toast.success({title: "Taxa atualizada com sucesso."})

                          // ✅ refetch pra garantir que snapshot voltou igual
                          await qc.invalidateQueries({
                            predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes(fairId),
                          })

                          // ✅ mantém override até chegar resposta nova
                          // (opcional) se quiser “limpar” pra confiar 100% no servidor:
                          // setTaxOverrideByStallFairId((s) => {
                          //   const copy = { ...s }
                          //   delete copy[stallFairId]
                          //   return copy
                          // })
                        },
                        onError: (err: any) => {
                          // ✅ reverte optimistic
                          setTaxOverrideByStallFairId((s) => ({ ...s, [stallFairId]: prev }))

                          const msg =
                            err?.message ||
                            err?.response?.data?.message?.[0] ||
                            "Não foi possível atualizar a taxa."
                          toast.error({title: msg})
                        },
                      },
                    )
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={activeTaxes.length === 0 ? "Nenhuma taxa ativa" : "Selecionar taxa"}
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {activeTaxes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({bpsToPercentLabel(t.percentBps)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!stallFairId ? (
                  <div className="mt-2 text-xs text-destructive">
                    Este item não possui <span className="font-mono">stallFairId</span>.
                  </div>
                ) : null}
              </div>
            </div>

            <Separator className="my-3" />

            {/* Infos extras */}
            <div className="flex justify-between sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm flex flex-col">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Banner</span>
                </div>
                <span className="font-semibold">{clampText(stall.bannerName ?? null)}</span>
              </div>

              <div className="text-sm flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Maquinhas</span>
                </div>
                <span className="font-semibold">{String(stall.machinesQty ?? 0)}</span>
              </div>

              <div className="text-sm flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Equipe</span>
                </div>
                <span className="font-semibold">{String(stall.teamQty ?? 0)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
