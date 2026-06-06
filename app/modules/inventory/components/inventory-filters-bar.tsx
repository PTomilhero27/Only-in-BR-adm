"use client";

/**
 * Barra de filtros simples do estoque.
 *
 * Responsabilidade:
 * - Concentrar inputs comuns das listagens.
 * - Receber estado controlado da página para preservar a página como composição.
 */

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useInventoryCategoriesQuery } from "../inventory.queries";
import {
  inventoryItemStatusLabels,
  inventoryMovementTypeLabels,
  inventoryReservationStatusLabels,
  type InventoryItemStatus,
  type InventoryMovementType,
  type InventoryReservationStatus,
} from "../types";

type InventoryFiltersBarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  category?: string;
  onCategoryChange?: (value: string) => void;
  itemStatus?: InventoryItemStatus | "ALL";
  onItemStatusChange?: (value: InventoryItemStatus | "ALL") => void;
  reservationStatus?: InventoryReservationStatus | "ALL";
  onReservationStatusChange?: (value: InventoryReservationStatus | "ALL") => void;
  movementType?: InventoryMovementType | "ALL";
  onMovementTypeChange?: (value: InventoryMovementType | "ALL") => void;
  lowStock?: boolean;
  onLowStockChange?: (value: boolean) => void;
  fairId?: string;
  onFairIdChange?: (value: string) => void;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
};

export function InventoryFiltersBar(props: InventoryFiltersBarProps) {
  const { data: categories = [] } = useInventoryCategoriesQuery();

  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      {props.onSearchChange ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={props.search ?? ""}
            onChange={(event) => props.onSearchChange?.(event.target.value)}
            placeholder="Buscar"
            className="pl-9"
          />
        </div>
      ) : null}

      {props.onCategoryChange ? (
        <Select
          value={props.category || "ALL"}
          onValueChange={(value) => props.onCategoryChange?.(value === "ALL" ? "" : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {props.onItemStatusChange ? (
        <Select
          value={props.itemStatus ?? "ALL"}
          onValueChange={(value) =>
            props.onItemStatusChange?.(value as InventoryItemStatus | "ALL")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {Object.entries(inventoryItemStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {props.onReservationStatusChange ? (
        <Select
          value={props.reservationStatus ?? "ALL"}
          onValueChange={(value) =>
            props.onReservationStatusChange?.(
              value as InventoryReservationStatus | "ALL",
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {Object.entries(inventoryReservationStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {props.onMovementTypeChange ? (
        <Select
          value={props.movementType ?? "ALL"}
          onValueChange={(value) =>
            props.onMovementTypeChange?.(value as InventoryMovementType | "ALL")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            {Object.entries(inventoryMovementTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {props.onFairIdChange ? (
        <Input
          value={props.fairId ?? ""}
          onChange={(event) => props.onFairIdChange?.(event.target.value)}
          placeholder="ID da feira/evento"
        />
      ) : null}

      {props.onFromChange ? (
        <Input
          type="date"
          value={props.from ?? ""}
          onChange={(event) => props.onFromChange?.(event.target.value)}
        />
      ) : null}

      {props.onToChange ? (
        <Input
          type="date"
          value={props.to ?? ""}
          onChange={(event) => props.onToChange?.(event.target.value)}
        />
      ) : null}
    </div>
  );
}
