"use client";

/**
 * Tabela de histórico de movimentações.
 *
 * Responsabilidade:
 * - Exibir o histórico completo com leitura operacional.
 * - Diferenciar visualmente entradas, saídas, devoluções, perdas e danos.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  inventoryMovementTypeLabels,
  type InventoryMovement,
  type InventoryMovementType,
} from "../types";

const typeClassName: Record<InventoryMovementType, string> = {
  IN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  OUT: "border-red-200 bg-red-50 text-red-700",
  RETURN: "border-sky-200 bg-sky-50 text-sky-700",
  LOSS: "border-amber-200 bg-amber-50 text-amber-800",
  ADJUSTMENT: "border-violet-200 bg-violet-50 text-violet-700",
  DAMAGE: "border-orange-200 bg-orange-50 text-orange-700",
};

export function InventoryMovementsTable({
  movements,
}: {
  movements: InventoryMovement[];
}) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Evento/finalidade</TableHead>
            <TableHead>Responsável/criado por</TableHead>
            <TableHead>Observação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>
                {movement.createdAt
                  ? new Date(movement.createdAt).toLocaleString("pt-BR")
                  : "-"}
              </TableCell>
              <TableCell className="font-medium text-primary">
                {movement.itemName ?? movement.item?.name ?? "-"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("font-normal", typeClassName[movement.type])}
                >
                  {inventoryMovementTypeLabels[movement.type]}
                </Badge>
              </TableCell>
              <TableCell>{movement.quantity}</TableCell>
              <TableCell>{movement.fairName ?? movement.purpose ?? "-"}</TableCell>
              <TableCell>{movement.responsibleName ?? movement.createdByName ?? "-"}</TableCell>
              <TableCell className="max-w-[320px] whitespace-normal">
                {movement.notes || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
