"use client";

/**
 * Tabela de reservas de estoque.
 *
 * Responsabilidade:
 * - Listar reservas e resumir sua etapa operacional.
 * - Delegar regras de ações ao ReservationActionsMenu.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";

import type { InventoryReservation } from "../types";
import { ReservationActionsMenu } from "./reservation-actions-menu";
import { ReservationStatusBadge } from "./reservation-status-badge";

export function InventoryReservationsTable({
  reservations,
  onView,
  onPickup,
  onReturn,
  onCancel,
}: {
  reservations: InventoryReservation[];
  onView: (reservation: InventoryReservation) => void;
  onPickup: (reservation: InventoryReservation) => void;
  onReturn: (reservation: InventoryReservation) => void;
  onCancel: (reservation: InventoryReservation) => void;
}) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código/ID</TableHead>
            <TableHead>Evento ou finalidade</TableHead>
            <TableHead>Solicitante/responsável</TableHead>
            <TableHead>Itens</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Retirada prevista</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="w-12">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell className="font-medium text-primary">
                {reservation.code ?? reservation.id.slice(0, 8)}
              </TableCell>
              <TableCell>{reservation.fairName ?? reservation.purpose ?? "-"}</TableCell>
              <TableCell>
                {reservation.requesterName ?? reservation.responsibleName ?? "-"}
              </TableCell>
              <TableCell>{reservation.items.length}</TableCell>
              <TableCell>
                <ReservationStatusBadge status={reservation.status} />
              </TableCell>
              <TableCell>
                {reservation.expectedPickupAt
                  ? new Date(reservation.expectedPickupAt).toLocaleString("pt-BR")
                  : "-"}
              </TableCell>
              <TableCell>
                {reservation.createdAt
                  ? new Date(reservation.createdAt).toLocaleString("pt-BR")
                  : "-"}
              </TableCell>
              <TableCell>
                <ReservationActionsMenu
                  reservation={reservation}
                  onView={() => onView(reservation)}
                  onPickup={() => onPickup(reservation)}
                  onReturn={() => onReturn(reservation)}
                  onCancel={() => onCancel(reservation)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
