"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

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

import { useApproveInventoryReservationMutation } from "../inventory.queries";
import type { InventoryReservation } from "../types";

export function ApproveReservationDialog({
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
  const mutation = useApproveInventoryReservationMutation();

  useEffect(() => {
    if (!open || !reservation) return;
    setQuantities(
      Object.fromEntries(
        reservation.items.map((item) => [item.itemId, String(item.requestedQty)]),
      ),
    );
    setNotes("");
  }, [open, reservation]);

  async function handleSubmit() {
    if (!reservation) return;

    const items = reservation.items.map((item) => ({
      itemId: item.itemId,
      approvedQty: Number(quantities[item.itemId] ?? item.requestedQty ?? 0),
    }));

    if (items.some((item) => item.approvedQty < 0)) {
      toast.warning({ title: "A quantidade aprovada não pode ser negativa." });
      return;
    }

    const invalid = reservation.items.some((item) => {
      const approvedQty = Number(quantities[item.itemId] ?? 0);
      return approvedQty > item.requestedQty;
    });

    if (invalid) {
      toast.warning({ title: "A quantidade aprovada não pode exceder a solicitada." });
      return;
    }

    try {
      await mutation.mutateAsync({
        id: reservation.id,
        payload: { notes: notes.trim() || null, items },
      });
      toast.success({ title: "Reserva aprovada com sucesso!" });
      onOpenChange(false);
    } catch (error) {
      toast.error({ title: "Erro ao aprovar reserva", subtitle: getErrorMessage(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar reserva</DialogTitle>
        </DialogHeader>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Confirmar aprovação</AlertTitle>
          <AlertDescription>
            Defina as quantidades aprovadas para cada item solicitado.
          </AlertDescription>
        </Alert>
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {reservation?.items.map((item) => (
            <div key={item.itemId} className="grid grid-cols-[1fr_120px] items-center gap-3">
              <span className="text-sm">
                {item.itemName ?? item.item?.name ?? item.itemId} (Solicitado: {item.requestedQty})
              </span>
              <Input
                type="number"
                min={0}
                max={item.requestedQty}
                value={quantities[item.itemId] ?? "0"}
                onChange={(event) =>
                  setQuantities((current) => ({ ...current, [item.itemId]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div className="space-y-2 mt-3">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observação da aprovação (opcional)"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Aprovando..." : "Confirmar aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
