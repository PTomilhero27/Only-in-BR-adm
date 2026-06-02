"use client";

/**
 * Dialog de detalhes da reserva.
 *
 * Responsabilidade:
 * - Mostrar dados completos da reserva, itens e movimentações relacionadas.
 * - Servir como ponto de conferência antes de ações do ciclo operacional.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type { InventoryReservation } from "../types";
import { ReservationStatusBadge } from "./reservation-status-badge";

export function InventoryReservationDetailsDialog({
  open,
  onOpenChange,
  reservation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: InventoryReservation | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Reserva {reservation?.code ?? reservation?.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>

        {reservation ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <ReservationStatusBadge status={reservation.status} />
              <span className="text-muted-foreground">
                Criada em{" "}
                {reservation.createdAt
                  ? new Date(reservation.createdAt).toLocaleString("pt-BR")
                  : "-"}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Evento/finalidade" value={reservation.fairName ?? reservation.purpose ?? "-"} />
              <Info label="Solicitante" value={reservation.requesterName ?? "-"} />
              <Info label="Responsável" value={reservation.responsibleName ?? "-"} />
              <Info
                label="Retirada prevista"
                value={
                  reservation.expectedPickupAt
                    ? new Date(reservation.expectedPickupAt).toLocaleString("pt-BR")
                    : "-"
                }
              />
            </div>

            {reservation.notes ? (
              <Info label="Observações" value={reservation.notes} />
            ) : null}

            <Separator />

            <div>
              <h3 className="font-medium text-primary">Itens</h3>
              <div className="mt-3 space-y-2">
                {reservation.items.map((item) => (
                  <div key={item.itemId} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6">
                    <span className="font-medium text-primary sm:col-span-2">
                      {item.itemName ?? item.item?.name ?? item.itemId}
                    </span>
                    <span>Solicitado: {item.requestedQty}</span>
                    <span>Aprovado: {item.approvedQty ?? 0}</span>
                    <span>Retirado: {item.pickedQty ?? 0}</span>
                    <span>Devolvido: {item.returnedQty ?? 0}</span>
                    <span>Perda/consumo: {(item.lostQty ?? 0) + (item.consumedQty ?? 0)}</span>
                    <span>Dano: {item.damagedQty ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {reservation.movements?.length ? (
              <div>
                <h3 className="font-medium text-primary">Histórico relacionado</h3>
                <div className="mt-2 space-y-2">
                  {reservation.movements.map((movement) => (
                    <p key={movement.id} className="rounded-md border bg-muted/40 p-2 text-muted-foreground">
                      {movement.createdAt ? new Date(movement.createdAt).toLocaleString("pt-BR") : "-"} · {movement.type} · {movement.quantity} · {movement.notes ?? "Sem observação"}
                    </p>
                  ))}
                </div>
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
