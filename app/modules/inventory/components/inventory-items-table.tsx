"use client";

/**
 * Tabela de itens de estoque.
 *
 * Responsabilidade:
 * - Apresentar a lista de itens vindos da API.
 * - Concentrar ações por linha sem acoplar a tabela aos dialogs.
 * - Usar AlertDialog para inativação, que é uma ação operacional importante.
 */

import { useState } from "react";
import { Archive, Eye, MoreHorizontal, Pencil, RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";

import { useInactiveInventoryItemMutation } from "../inventory.queries";
import type { InventoryItem } from "../types";
import { InventoryAvailabilityBadge } from "./inventory-availability-badge";
import { InventoryStatusBadge } from "./inventory-status-badge";

export function InventoryItemsTable({
  items,
  onView,
  onEdit,
  onMovement,
}: {
  items: InventoryItem[];
  onView: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onMovement: (item: InventoryItem) => void;
}) {
  const [inactiveItem, setInactiveItem] = useState<InventoryItem | null>(null);
  const mutation = useInactiveInventoryItemMutation();

  async function handleInactive() {
    if (!inactiveItem) return;
    try {
      await mutation.mutateAsync(inactiveItem.id);
      toast.success({ title: "Item inativado" });
      setInactiveItem(null);
    } catch (error) {
      toast.error({ title: "Erro ao inativar item", subtitle: getErrorMessage(error) });
    }
  }

  return (
    <>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Quantidade atual</TableHead>
              <TableHead>Quantidade mínima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Disponibilidade</TableHead>
              <TableHead className="w-12">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium text-primary">{item.name}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={item.categories?.map((c) => c.name).join(", ") || item.category || ""}>
                  {item.categories?.map((c) => c.name).join(", ") || item.category || "-"}
                </TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{item.currentQty}</TableCell>
                <TableCell>{item.minQty}</TableCell>
                <TableCell>
                  <InventoryStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <InventoryAvailabilityBadge
                    currentQty={item.currentQty}
                    minQty={item.minQty}
                    availableQty={item.availableQty}
                    reservedQty={item.reservedQty}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(item)}>
                        <Eye className="h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMovement(item)}>
                        <RotateCcw className="h-4 w-4" />
                        Registrar movimentação
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setInactiveItem(item)}
                        disabled={item.status === "INACTIVE"}
                      >
                        <Archive className="h-4 w-4" />
                        Inativar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!inactiveItem} onOpenChange={(open) => !open && setInactiveItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar item</AlertDialogTitle>
            <AlertDialogDescription>
              O item deixará de aparecer como disponível para novas operações. Esta ação não apaga o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleInactive} disabled={mutation.isPending}>
              {mutation.isPending ? "Inativando..." : "Inativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
