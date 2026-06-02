"use client";

/**
 * Dialog de criação de reserva.
 *
 * Responsabilidade:
 * - Criar reservas em lote vinculadas a uma feira ou finalidade avulsa.
 * - Reutilizar o hook existente de feiras, sem duplicar service do módulo fairs.
 */

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query";
import { api } from "@/app/shared/http/api";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
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

import { useCreateInventoryReservationMutation } from "../inventory.queries";
import type { InventoryItem } from "../types";
import {
  ReservationItemsEditor,
  type ReservationEditorRow,
} from "./reservation-items-editor";

export function InventoryReservationCreateDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}) {
  const { user } = useAuth();
  const [fairId, setFairId] = useState("NONE");
  const [purpose, setPurpose] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [expectedPickupAt, setExpectedPickupAt] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ReservationEditorRow[]>([
    { itemId: "", requestedQty: "1" },
  ]);

  const { data: fairs = [] } = useFairsQuery({ status: "ATIVA" });
  const mutation = useCreateInventoryReservationMutation();

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
    if (open) {
      setFairId("NONE");
      setPurpose("");
      setRequesterName(user?.name ?? "");
      setResponsibleName("");
      setExpectedPickupAt("");
      setNotes("");
      setRows([{ itemId: "", requestedQty: "1" }]);
    }
  }, [open, user]);

  async function handleSubmit() {
    const normalizedFairId = fairId === "NONE" ? null : fairId;
    const normalizedRows = rows
      .filter((row) => row.itemId)
      .map((row) => ({ itemId: row.itemId, requestedQty: Number(row.requestedQty) }));

    if (!normalizedFairId && !purpose.trim()) {
      toast.warning({ title: "Informe a finalidade da reserva." });
      return;
    }

    if (normalizedRows.length === 0) {
      toast.warning({ title: "Adicione pelo menos um item." });
      return;
    }

    if (new Set(normalizedRows.map((row) => row.itemId)).size !== normalizedRows.length) {
      toast.warning({ title: "Não repita o mesmo item na reserva." });
      return;
    }

    if (normalizedRows.some((row) => !Number.isInteger(row.requestedQty) || row.requestedQty <= 0)) {
      toast.warning({ title: "As quantidades precisam ser inteiras e positivas." });
      return;
    }

    try {
      await mutation.mutateAsync({
        fairId: normalizedFairId,
        purpose: purpose.trim() || null,
        requesterName: requesterName.trim() || null,
        responsibleName: responsibleName.trim() || null,
        expectedPickupAt: expectedPickupAt || null,
        notes: notes.trim() || null,
        items: normalizedRows,
      });
      toast.success({ title: "Reserva criada" });
      onOpenChange(false);
    } catch (error) {
      toast.error({ title: "Erro ao criar reserva", subtitle: getErrorMessage(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nova reserva</DialogTitle>
          <DialogDescription>
            Monte um lote de itens para feira/evento ou uma finalidade avulsa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Feira/evento</Label>
            <Select value={fairId} onValueChange={setFairId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sem feira vinculada</SelectItem>
                {fairs.map((fair) => (
                  <SelectItem key={fair.id} value={fair.id}>
                    {fair.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Finalidade">
            <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          </Field>
          <Field label="Solicitante">
            <Input
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
            />
          </Field>
          <Field label="Responsável">
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
          </Field>
          <Field label="Data prevista de retirada">
            <Input
              type="datetime-local"
              value={expectedPickupAt}
              onChange={(event) => setExpectedPickupAt(event.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observações">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ReservationItemsEditor items={items} rows={rows} onRowsChange={setRows} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Criando..." : "Criar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
