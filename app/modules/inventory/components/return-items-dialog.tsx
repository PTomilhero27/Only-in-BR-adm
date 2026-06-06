"use client";

/**
 * Dialog de devolução.
 *
 * Responsabilidade:
 * - Registrar devolução total/parcial, perdas, consumo e danos.
 * - Mostrar um resumo visual por item antes de enviar para o backend.
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";

import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

import { useReturnInventoryReservationMutation } from "../inventory.queries";
import { getInventoryItem } from "../inventory.service";
import type { InventoryReservation } from "../types";

type ReturnRow = {
  returnedQty: string;
  consumedQty: string;
  lostQty: string;
  damagedQty: string;
  notes: string;
};

type WarningItem = {
  name: string;
  currentQty: number;
  minQty: number;
  status: string;
};

export function ReturnItemsDialog({
  open,
  onOpenChange,
  reservation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: InventoryReservation | null;
}) {
  const [rows, setRows] = useState<Record<string, ReturnRow>>({});
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"form" | "warnings">("form");
  const [lowStockWarnings, setLowStockWarnings] = useState<WarningItem[]>([]);
  const mutation = useReturnInventoryReservationMutation();

  useEffect(() => {
    if (!open || !reservation) return;
    setRows(
      Object.fromEntries(
        reservation.items.map((item) => [
          item.itemId,
          {
            returnedQty: String(Math.max((item.pickedQty ?? 0) - (item.returnedQty ?? 0), 0)),
            consumedQty: "0",
            lostQty: "0",
            damagedQty: "0",
            notes: "",
          },
        ]),
      ),
    );
    setNotes("");
    setStep("form");
    setLowStockWarnings([]);
  }, [open, reservation]);

  const summaries = useMemo(
    () =>
      reservation?.items.map((item) => {
        const row = rows[item.itemId];
        const picked = item.pickedQty ?? 0;
        const returned = Number(row?.returnedQty ?? 0);
        const consumed = Number(row?.consumedQty ?? 0);
        const lost = Number(row?.lostQty ?? 0);
        const damaged = Number(row?.damagedQty ?? 0);
        return { item, picked, returned, consumed, lost, damaged, pending: picked - returned - consumed - lost - damaged };
      }) ?? [],
    [reservation, rows],
  );

  async function handleSubmit(conclude: boolean = false) {
    if (!reservation) return;

    if (summaries.some((summary) => summary.returned < 0 || summary.consumed < 0 || summary.lost < 0 || summary.damaged < 0)) {
      toast.warning({ title: "As quantidades não podem ser negativas." });
      return;
    }

    // Removida a exigência de observação explicativa para divergências de devolução

    const finalItems = summaries.map((summary) => {
      let returned = summary.returned;
      let consumed = summary.consumed;
      let lost = summary.lost;
      let damaged = summary.damaged;

      if (conclude) {
        const unresolved = summary.picked - (returned + consumed + lost + damaged);
        if (unresolved > 0) {
          consumed += unresolved;
        }
      }

      return {
        itemId: summary.item.itemId,
        returnedQty: returned,
        consumedQty: consumed,
        lostQty: lost,
        damagedQty: damaged,
        notes: rows[summary.item.itemId]?.notes.trim() || null,
      };
    });

    try {
      await mutation.mutateAsync({
        id: reservation.id,
        payload: {
          notes: notes.trim() || null,
          items: finalItems,
        },
      });

      if (conclude) {
        const itemsToWarn: WarningItem[] = [];
        for (const item of reservation.items) {
          try {
            const updated = await getInventoryItem(item.itemId);
            if (updated.currentQty <= updated.minQty || updated.currentQty <= 0) {
              itemsToWarn.push({
                name: updated.name,
                currentQty: updated.currentQty,
                minQty: updated.minQty,
                status: updated.status,
              });
            }
          } catch (err) {
            console.error("Erro ao verificar estoque atualizado:", err);
          }
        }

        if (itemsToWarn.length > 0) {
          setLowStockWarnings(itemsToWarn);
          setStep("warnings");
          toast.success({ title: "Devolução concluída com sucesso!" });
          return;
        }
      }

      toast.success({ title: conclude ? "Devolução concluída" : "Devolução registrada" });
      onOpenChange(false);
    } catch (error) {
      toast.error({
        title: conclude ? "Erro ao concluir devolução" : "Erro ao registrar devolução",
        subtitle: getErrorMessage(error),
      });
    }
  }

  function update(itemId: string, patch: Partial<ReturnRow>) {
    setRows((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  }

  if (step === "warnings") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3 border border-amber-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Atenção: Controle de Estoque
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1.5">
              A devolução foi concluída com sucesso, mas alguns itens atingiram níveis críticos e precisam de reposição:
            </p>
          </DialogHeader>

          <div className="space-y-3 my-4">
            {lowStockWarnings.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-3.5 rounded-xl border p-4 transition-all hover:shadow-sm",
                  item.currentQty <= 0
                    ? "bg-red-50/40 border-red-150 text-red-950"
                    : "bg-amber-50/40 border-amber-150 text-amber-950"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {item.currentQty <= 0 ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-primary">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>Qtd. Atual: <strong className="text-foreground font-semibold">{item.currentQty}</strong></span>
                    <span>·</span>
                    <span>Mínimo: <strong>{item.minQty}</strong></span>
                  </div>
                </div>
                <div className="shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border",
                      item.currentQty <= 0
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {item.currentQty <= 0 ? "Esgotado" : "Estoque Baixo"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Registrar devolução</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {summaries.map(({ item, picked, returned, consumed, lost, damaged, pending }) => (
            <div key={item.itemId} className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium text-primary">{item.itemName ?? item.item?.name ?? item.itemId}</p>
                <p className="text-xs text-muted-foreground">
                  Saiu {picked} · Voltou {returned} · Consumido/perdido {consumed + lost} · Danificado {damaged} · Pendente {pending}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-5">
                <NumberField label="Devolvida" value={rows[item.itemId]?.returnedQty} onChange={(value) => update(item.itemId, { returnedQty: value })} />
                <NumberField label="Consumida" value={rows[item.itemId]?.consumedQty} onChange={(value) => update(item.itemId, { consumedQty: value })} />
                <NumberField label="Perdida" value={rows[item.itemId]?.lostQty} onChange={(value) => update(item.itemId, { lostQty: value })} />
                <NumberField label="Danificada" value={rows[item.itemId]?.damagedQty} onChange={(value) => update(item.itemId, { damagedQty: value })} />
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={rows[item.itemId]?.notes ?? ""} onChange={(event) => update(item.itemId, { notes: event.target.value })} />
                </div>
              </div>
            </div>
          ))}
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observação geral" />
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              className="flex-1 sm:flex-initial"
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={mutation.isPending}
            >
              Salvar progresso
            </Button>
            <Button
              className="flex-1 sm:flex-initial"
              onClick={() => handleSubmit(true)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Concluindo..." : "Concluir devolução"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" min={0} value={value ?? "0"} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
