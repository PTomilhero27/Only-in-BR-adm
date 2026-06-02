"use client";

/**
 * Dialog de cadastro/edição de item.
 *
 * Responsabilidade:
 * - Coletar dados básicos do item de estoque.
 * - Validar campos essenciais antes de chamar as mutations.
 * - Exibir feedback em português para sucesso e falha.
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

import {
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
} from "../inventory.queries";
import {
  inventoryItemStatusLabels,
  type InventoryItem,
  type InventoryItemStatus,
} from "../types";

type FormState = {
  name: string;
  category: string;
  unit: string;
  imageUrl: string;
  location: string;
  initialQty: string;
  minQty: string;
  status: InventoryItemStatus;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  category: "",
  unit: "UN",
  imageUrl: "",
  location: "",
  initialQty: "0",
  minQty: "0",
  status: "IN_STOCK",
  notes: "",
};

export function InventoryItemUpsertDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const createMutation = useCreateInventoryItemMutation();
  const updateMutation = useUpdateInventoryItemMutation();
  const isEditing = Boolean(item);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(
      item
        ? {
            name: item.name,
            category: item.category ?? "",
            unit: item.unit || "UN",
            imageUrl: item.imageUrl ?? "",
            location: item.location ?? "",
            initialQty: String(item.currentQty ?? 0),
            minQty: String(item.minQty ?? 0),
            status: item.status,
            notes: item.notes ?? "",
          }
        : emptyForm,
    );
  }, [item, open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.warning({ title: "Informe o nome do item." });
      return;
    }

    const minQty = Number(form.minQty);
    const initialQty = Number(form.initialQty);

    if (Number.isNaN(minQty) || minQty < 0) {
      toast.warning({ title: "Quantidade mínima inválida." });
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        unit: form.unit.trim() || "UN",
        imageUrl: form.imageUrl.trim() || null,
        location: form.location.trim() || null,
        minQty,
        status: form.status,
        notes: form.notes.trim() || null,
        ...(!isEditing ? { initialQty: Math.max(initialQty || 0, 0) } : {}),
      };

      if (item) {
        await updateMutation.mutateAsync({ id: item.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      toast.success({
        title: isEditing ? "Item atualizado" : "Item cadastrado",
        subtitle: "O estoque foi sincronizado com a API.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error({ title: "Erro ao salvar item", subtitle: getErrorMessage(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar item" : "Adicionar item"}</DialogTitle>
          <DialogDescription>
            Informe os dados usados para controlar quantidade, localização e alertas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Categoria">
            <Input
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            />
          </Field>
          <Field label="Unidade">
            <Input value={form.unit} onChange={(e) => update("unit", e.target.value)} />
          </Field>
          <Field label="Localização">
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </Field>
          {!isEditing ? (
            <Field label="Quantidade inicial">
              <Input
                type="number"
                min={0}
                value={form.initialQty}
                onChange={(e) => update("initialQty", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Quantidade mínima">
            <Input
              type="number"
              min={0}
              value={form.minQty}
              onChange={(e) => update("minQty", e.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(value) => update("status", value as InventoryItemStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(inventoryItemStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Imagem URL">
            <Input
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observações">
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
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
