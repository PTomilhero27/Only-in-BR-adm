"use client";

/**
 * Menu de ações da reserva.
 *
 * Responsabilidade:
 * - Expor somente ações compatíveis com o status atual.
 * - Encapsular chamadas simples do ciclo de reserva com toast e invalidação via hooks.
 */

import { Eye, MoreHorizontal, PackageCheck, PackageOpen, Truck, Undo2, X } from "lucide-react";

import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import {
  useApproveInventoryReservationMutation,
  useMarkInventoryReservationReadyMutation,
  useMarkInventoryReservationSeparatingMutation,
} from "../inventory.queries";
import type { InventoryReservation } from "../types";

export function ReservationActionsMenu({
  reservation,
  onView,
  onPickup,
  onReturn,
  onCancel,
}: {
  reservation: InventoryReservation;
  onView: () => void;
  onPickup: () => void;
  onReturn: () => void;
  onCancel: () => void;
}) {
  const approveMutation = useApproveInventoryReservationMutation();
  const separatingMutation = useMarkInventoryReservationSeparatingMutation();
  const readyMutation = useMarkInventoryReservationReadyMutation();

  async function runAction(action: () => Promise<unknown>, title: string) {
    try {
      await action();
      toast.success({ title });
    } catch (error) {
      toast.error({ title: "Erro na reserva", subtitle: getErrorMessage(error) });
    }
  }

  const canApprove = reservation.status === "PENDING";
  const canSeparate = reservation.status === "APPROVED";
  const canReady = reservation.status === "APPROVED" || reservation.status === "SEPARATING";
  const canPickup =
    reservation.status === "APPROVED" ||
    reservation.status === "SEPARATING" ||
    reservation.status === "READY_FOR_PICKUP";
  const canReturn =
    reservation.status === "PICKED_UP" || reservation.status === "PARTIALLY_RETURNED";
  const canCancel = ["PENDING", "APPROVED", "SEPARATING", "READY_FOR_PICKUP"].includes(
    reservation.status,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4" />
          Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {canApprove ? (
          <DropdownMenuItem
            onClick={() =>
              runAction(
                () =>
                  approveMutation.mutateAsync({
                    id: reservation.id,
                    payload: {
                      items: reservation.items.map((item) => ({
                        itemId: item.itemId,
                        approvedQty: item.requestedQty,
                        notes: item.notes ?? null,
                      })),
                    },
                  }),
                "Reserva aprovada",
              )
            }
          >
            <PackageCheck className="h-4 w-4" />
            Aprovar
          </DropdownMenuItem>
        ) : null}
        {canSeparate ? (
          <DropdownMenuItem
            onClick={() =>
              runAction(
                () => separatingMutation.mutateAsync(reservation.id),
                "Reserva em separação",
              )
            }
          >
            <PackageOpen className="h-4 w-4" />
            Marcar em separação
          </DropdownMenuItem>
        ) : null}
        {canReady ? (
          <DropdownMenuItem
            onClick={() =>
              runAction(() => readyMutation.mutateAsync(reservation.id), "Reserva pronta")
            }
          >
            <PackageCheck className="h-4 w-4" />
            Marcar pronta
          </DropdownMenuItem>
        ) : null}
        {canPickup ? (
          <DropdownMenuItem onClick={onPickup}>
            <Truck className="h-4 w-4" />
            Marcar retirada
          </DropdownMenuItem>
        ) : null}
        {canReturn ? (
          <DropdownMenuItem onClick={onReturn}>
            <Undo2 className="h-4 w-4" />
            Registrar devolução
          </DropdownMenuItem>
        ) : null}
        {canCancel ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onCancel}>
              <X className="h-4 w-4" />
              Cancelar
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
