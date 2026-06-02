"use client";

/**
 * Dialog de detalhe de item.
 *
 * Responsabilidade:
 * - Mostrar os dados operacionais de um item sem permitir alteração acidental.
 * - Apoiar conferência rápida de disponibilidade e localização.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type { InventoryItem } from "../types";
import { InventoryAvailabilityBadge } from "./inventory-availability-badge";
import { InventoryStatusBadge } from "./inventory-status-badge";

export function InventoryItemDetailsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.name ?? "Detalhe do item"}</DialogTitle>
        </DialogHeader>

        {item ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <InventoryStatusBadge status={item.status} />
              <InventoryAvailabilityBadge
                currentQty={item.currentQty}
                minQty={item.minQty}
                availableQty={item.availableQty}
                reservedQty={item.reservedQty}
              />
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Categoria" value={item.category || "Sem categoria"} />
              <Info label="Unidade" value={item.unit} />
              <Info label="Quantidade atual" value={String(item.currentQty)} />
              <Info label="Quantidade mínima" value={String(item.minQty)} />
              <Info label="Localização" value={item.location || "Não informada"} />
              <Info
                label="Atualizado em"
                value={item.updatedAt ? new Date(item.updatedAt).toLocaleString("pt-BR") : "-"}
              />
            </div>
            {item.notes ? (
              <div>
                <p className="font-medium text-primary">Observações</p>
                <p className="mt-1 text-muted-foreground">{item.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-primary">{value}</p>
    </div>
  );
}
