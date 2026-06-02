"use client";

/**
 * Dialog de movimentação manual.
 *
 * Responsabilidade:
 * - Permitir entrada, ajuste e dano sem expor ações automáticas de reserva.
 * - Exigir observação quando a operação pode gerar divergência operacional.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";

import { useCreateInventoryMovementMutation } from "../inventory.queries";
import { inventoryMovementTypeLabels, type InventoryItem } from "../types";

type ManualMovementType = "IN" | "ADJUSTMENT" | "DAMAGE";

export function InventoryMovementDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
}) {
  const [type, setType] = useState<ManualMovementType>("IN");
  const [quantity, setQuantity] = useState("1");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const mutation = useCreateInventoryMovementMutation();

  useEffect(() => {
    if (!open) return;
    setType("IN");
    setQuantity("1");
    setPurpose("");
    setNotes("");
  }, [open]);

  async function handleSubmit() {
    if (!item) return;
    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      toast.warning({ title: "Informe uma quantidade inteira positiva." });
      return;
    }

    if ((type === "ADJUSTMENT" || type === "DAMAGE") && !notes.trim()) {
      toast.warning({ title: "Observação obrigatória para ajuste ou dano." });
      return;
    }

    try {
      await mutation.mutateAsync({
        itemId: item.id,
        payload: {
          type,
          quantity: parsedQuantity,
          purpose: purpose.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success({ title: "Movimentação registrada" });
      onOpenChange(false);
    } catch (error) {
      toast.error({
        title: "Erro ao registrar movimentação",
        subtitle: getErrorMessage(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            {item ? `Registrar movimentação manual para ${item.name}.` : "Selecione um item."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as ManualMovementType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["IN", "ADJUSTMENT", "DAMAGE"] as ManualMovementType[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {inventoryMovementTypeLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Finalidade</Label>
            <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!item || mutation.isPending}>
            {mutation.isPending ? "Registrando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
