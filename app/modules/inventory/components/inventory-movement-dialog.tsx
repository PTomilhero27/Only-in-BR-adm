"use client";

/**
 * Dialog de movimentação manual.
 *
 * Responsabilidade:
 * - Permitir entrada, ajuste e dano sem expor ações automáticas de reserva.
 * - Exigir observação quando a operação pode gerar divergência operacional.
 */

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/shared/http/api";
import { useAuth } from "@/providers/auth-provider";
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

type ManualMovementType = "IN" | "OUT" | "ADJUSTMENT" | "DAMAGE";

export function InventoryMovementDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
}) {
  const { user } = useAuth();
  const [type, setType] = useState<ManualMovementType>("IN");
  const [quantity, setQuantity] = useState("1");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [hasReturn, setHasReturn] = useState<"yes" | "no">("no");
  const [responsibleName, setResponsibleName] = useState("");
  const mutation = useCreateInventoryMovementMutation();

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await api.get("users");
      return res as { items: Array<{ id: string; name: string; email: string }> };
    },
    enabled: open,
  });
  const users = usersData?.items ?? [];

  useEffect(() => {
    if (!open) return;
    setType("IN");
    setQuantity("1");
    setPurpose("");
    setNotes("");
    setHasReturn("no");
    setResponsibleName(user?.name ?? "");
  }, [open, user]);

  async function handleSubmit() {
    if (!item) return;
    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      toast.warning({ title: "Informe uma quantidade inteira positiva." });
      return;
    }

    if ((type === "OUT" || type === "DAMAGE") && parsedQuantity > (item.currentQty ?? 0)) {
      toast.warning({
        title: "Quantidade insuficiente em estoque.",
        subtitle: `O estoque atual deste item é de ${item.currentQty} unidades.`,
      });
      return;
    }

    if (!notes.trim()) {
      toast.warning({ title: "Observação obrigatória para todas as movimentações." });
      return;
    }

    if (type === "OUT" && !responsibleName.trim()) {
      toast.warning({ title: "Informe o responsável pela retirada." });
      return;
    }

    let finalNotes = notes.trim();
    let finalPurpose = purpose.trim();

    if (type === "OUT") {
      const current = item.currentQty ?? 0;
      const diff = Math.max(current - parsedQuantity, 0);
      if (hasReturn === "no") {
        const consumptionNote = `Saída para consumo. Retirado do estoque (Saldo anterior: ${current}, Novo saldo: ${diff}).`;
        finalNotes = `${finalNotes} - ${consumptionNote}`;
        finalPurpose = finalPurpose || "Consumo";
      } else {
        const returnNote = `Saída temporária (pendente de devolução).`;
        finalNotes = `${finalNotes} - ${returnNote}`;
        finalPurpose = finalPurpose || "Empréstimo/Uso temporário";
      }
    }

    try {
      await mutation.mutateAsync({
        itemId: item.id,
        payload: {
          type,
          quantity: parsedQuantity,
          purpose: finalPurpose || undefined,
          notes: finalNotes,
          requiresReturn: type === "OUT" && hasReturn === "yes" ? true : undefined,
          responsibleName: type === "OUT" ? responsibleName.trim() : undefined,
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
                {(["IN", "OUT", "ADJUSTMENT", "DAMAGE"] as ManualMovementType[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {inventoryMovementTypeLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "OUT" && (
            <div className="space-y-2">
              <Label>Vai ter devolução?</Label>
              <Select
                value={hasReturn}
                onValueChange={(value) => setHasReturn(value as "yes" | "no")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sim</SelectItem>
                  <SelectItem value="no">Não (Saída para consumo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "OUT" && (
            <div className="space-y-2">
              <Label>Responsável pela retirada</Label>
              <Select value={responsibleName} onValueChange={setResponsibleName}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
