"use client";

/**
 * Dialog de devolução.
 *
 * Responsabilidade:
 * - Registrar devolução total/parcial, perdas, consumo e danos.
 * - Mostrar um resumo visual por item antes de enviar para o backend.
 */

import { useEffect, useMemo, useState } from "react";

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

import { useReturnInventoryReservationMutation } from "../inventory.queries";
import type { InventoryReservation } from "../types";

type ReturnRow = {
  returnedQty: string;
  consumedQty: string;
  lostQty: string;
  damagedQty: string;
  notes: string;
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

  async function handleSubmit() {
    if (!reservation) return;

    if (summaries.some((summary) => summary.returned < 0 || summary.consumed < 0 || summary.lost < 0 || summary.damaged < 0)) {
      toast.warning({ title: "As quantidades não podem ser negativas." });
      return;
    }

    const exceeded = summaries.find(
      (summary) =>
        summary.returned + summary.consumed + summary.lost + summary.damaged > summary.picked,
    );
    if (exceeded && !rows[exceeded.item.itemId]?.notes.trim() && !notes.trim()) {
      toast.warning({ title: "Informe observação para divergência de devolução." });
      return;
    }

    try {
      await mutation.mutateAsync({
        id: reservation.id,
        payload: {
          notes: notes.trim() || null,
          items: summaries.map((summary) => ({
            itemId: summary.item.itemId,
            returnedQty: summary.returned,
            consumedQty: summary.consumed,
            lostQty: summary.lost,
            damagedQty: summary.damaged,
            notes: rows[summary.item.itemId]?.notes.trim() || null,
          })),
        },
      });
      toast.success({ title: "Devolução registrada" });
      onOpenChange(false);
    } catch (error) {
      toast.error({ title: "Erro ao registrar devolução", subtitle: getErrorMessage(error) });
    }
  }

  function update(itemId: string, patch: Partial<ReturnRow>) {
    setRows((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Registrando..." : "Registrar devolução"}
          </Button>
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
