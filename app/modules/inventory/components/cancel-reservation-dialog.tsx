"use client";

/**
 * Dialog de cancelamento de reserva.
 *
 * Responsabilidade:
 * - Exigir motivo antes de cancelar uma reserva não retirada.
 * - Encaminhar a mensagem amigável do backend quando a regra de negócio bloquear.
 */

import { useState } from "react";

import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { useCancelInventoryReservationMutation } from "../inventory.queries";
import type { InventoryReservation } from "../types";

export function CancelReservationDialog({
  open,
  onOpenChange,
  reservation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: InventoryReservation | null;
}) {
  const [notes, setNotes] = useState("");
  const mutation = useCancelInventoryReservationMutation();

  async function handleSubmit() {
    if (!reservation) return;
    if (!notes.trim()) {
      toast.warning({ title: "Informe o motivo do cancelamento." });
      return;
    }

    try {
      await mutation.mutateAsync({ id: reservation.id, payload: { notes: notes.trim() } });
      toast.success({ title: "Reserva cancelada" });
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      toast.error({ title: "Erro ao cancelar reserva", subtitle: getErrorMessage(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar reserva</DialogTitle>
        </DialogHeader>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Motivo/observação"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Cancelando..." : "Cancelar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
