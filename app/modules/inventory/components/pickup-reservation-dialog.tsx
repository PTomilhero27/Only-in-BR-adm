"use client";

/**
 * Dialog de retirada.
 *
 * Responsabilidade:
 * - Confirmar a baixa de estoque dos itens aprovados.
 * - Permitir ajuste da quantidade retirada antes de enviar ao backend.
 */

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { usePickupInventoryReservationMutation } from "../inventory.queries";
import type { InventoryReservation } from "../types";

export function PickupReservationDialog({
  open,
  onOpenChange,
  reservation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: InventoryReservation | null;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const mutation = usePickupInventoryReservationMutation();

  useEffect(() => {
    if (!open || !reservation) return;
    setQuantities(
      Object.fromEntries(
        reservation.items.map((item) => [item.itemId, String(item.approvedQty ?? item.requestedQty)]),
      ),
    );
    setNotes("");
  }, [open, reservation]);

  async function handleSubmit() {
    if (!reservation) return;

    const items = reservation.items.map((item) => ({
      itemId: item.itemId,
      pickedQty: Number(quantities[item.itemId] ?? item.approvedQty ?? 0),
    }));

    if (items.some((item) => item.pickedQty < 0)) {
      toast.warning({ title: "A retirada não pode ser negativa." });
      return;
    }

    const invalid = reservation.items.some((item) => {
      const pickedQty = Number(quantities[item.itemId] ?? 0);
      return pickedQty > (item.approvedQty ?? item.requestedQty);
    });

    if (invalid) {
      toast.warning({ title: "A retirada não pode exceder o aprovado." });
      return;
    }

    try {
      await mutation.mutateAsync({
        id: reservation.id,
        payload: { notes: notes.trim() || null, items },
      });
      toast.success({ title: "Retirada registrada" });
      onOpenChange(false);
    } catch (error) {
      toast.error({ title: "Erro ao registrar retirada", subtitle: getErrorMessage(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar retirada</DialogTitle>
        </DialogHeader>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>Esta ação vai reduzir o estoque dos itens selecionados.</AlertDescription>
        </Alert>
        <div className="space-y-3">
          {reservation?.items.map((item) => (
            <div key={item.itemId} className="grid grid-cols-[1fr_120px] items-center gap-3">
              <span className="text-sm">{item.itemName ?? item.item?.name ?? item.itemId}</span>
              <Input
                type="number"
                min={0}
                max={item.approvedQty ?? item.requestedQty}
                value={quantities[item.itemId] ?? "0"}
                onChange={(event) =>
                  setQuantities((current) => ({ ...current, [item.itemId]: event.target.value }))
                }
              />
            </div>
          ))}
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observação geral"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Registrando..." : "Confirmar retirada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
