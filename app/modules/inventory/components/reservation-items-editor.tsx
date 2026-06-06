"use client";

/**
 * Editor de itens da reserva.
 *
 * Responsabilidade:
 * - Listar itens selecionados de forma limpa.
 * - Permitir abrir um modal de seleção em lote dos itens em estoque.
 * - Pesquisa instantânea por nome no modal.
 * - Controle rápido de quantidade por botões de incremento/decremento e input manual.
 * - Consultar disponibilidade para orientar a aprovação futura.
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash, Search, Minus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useCheckInventoryAvailabilityMutation } from "../inventory.queries";
import type { InventoryAvailabilityResult, InventoryItem } from "../types";

export type ReservationEditorRow = {
  itemId: string;
  requestedQty: string;
  notes?: string;
};

export function ReservationItemsEditor({
  items,
  rows,
  onRowsChange,
}: {
  items: InventoryItem[];
  rows: ReservationEditorRow[];
  onRowsChange: (rows: ReservationEditorRow[]) => void;
}) {
  const [availability, setAvailability] = useState<InventoryAvailabilityResult[]>([]);
  const availabilityMutation = useCheckInventoryAvailabilityMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [tempQuantities, setTempQuantities] = useState<Record<string, number>>({});

  const payload = useMemo(
    () =>
      rows
        .filter((row) => row.itemId && Number(row.requestedQty) > 0)
        .map((row) => ({ itemId: row.itemId, quantity: Number(row.requestedQty) })),
    [rows],
  );

  useEffect(() => {
    if (payload.length === 0) {
      setAvailability([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const result = await availabilityMutation.mutateAsync({ items: payload });
        setAvailability(result);
      } catch {
        setAvailability([]);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  const openModal = () => {
    const currentQties: Record<string, number> = {};
    rows.forEach((row) => {
      if (row.itemId) {
        currentQties[row.itemId] = Number(row.requestedQty) || 1;
      }
    });
    setTempQuantities(currentQties);
    setSearchQuery("");
    setShowOnlySelected(false);
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    const newRows = Object.entries(tempQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, requestedQty: String(qty) }));

    onRowsChange(newRows.length > 0 ? newRows : [{ itemId: "", requestedQty: "1" }]);
    setIsModalOpen(false);
  };

  const handleQtyChange = (itemId: string, val: number) => {
    setTempQuantities((prev) => {
      const next = { ...prev };
      if (val <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = val;
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isSelected = !!tempQuantities[item.id];
      if (showOnlySelected) {
        return matchesSearch && isSelected;
      }
      return matchesSearch;
    });
  }, [items, searchQuery, showOnlySelected, tempQuantities]);

  const selectedIds = rows.map((row) => row.itemId).filter(Boolean);
  const totalSelectedItemsCount = Object.keys(tempQuantities).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Itens da reserva</Label>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openModal}>
          <Plus className="h-4 w-4" />
          Selecionar itens
        </Button>
      </div>

      {/* Lista Principal de Itens Selecionados */}
      <div className="space-y-3">
        {rows.filter((row) => row.itemId).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-center space-y-2 bg-muted/20">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
            <div className="font-medium text-sm text-muted-foreground">Nenhum item adicionado</div>
            <div className="text-xs text-muted-foreground/80 max-w-xs">
              Selecione os itens do estoque clicando no botão acima para incluí-los na reserva.
            </div>
          </div>
        ) : (
          rows
            .filter((row) => row.itemId)
            .map((row, index) => {
              const item = items.find((i) => i.id === row.itemId);
              if (!item) return null;

              const itemAvailability = availability.find((entry) => entry.itemId === row.itemId);
              const isDuplicate = selectedIds.filter((id) => id === row.itemId).length > 1;

              return (
                <div
                  key={row.itemId}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_auto] items-center bg-card shadow-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Estoque atual: {item.currentQty} {item.unit}
                    </span>
                  </div>

                  <Input
                    type="number"
                    min={1}
                    value={row.requestedQty}
                    onChange={(event) => {
                      const newQty = event.target.value;
                      onRowsChange(
                        rows.map((r) =>
                          r.itemId === row.itemId ? { ...r, requestedQty: newQty } : r
                        )
                      );
                    }}
                    className="h-9"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onRowsChange(rows.filter((r) => r.itemId !== row.itemId));
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                  >
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Remover item</span>
                  </Button>

                  {(itemAvailability || isDuplicate) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-3 pt-1 border-t border-dashed mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>
                        {isDuplicate
                          ? "Item duplicado na reserva."
                          : `Disponibilidade: ${itemAvailability?.availableQty ?? 0} disponível(eis) no estoque (Solicitado: ${itemAvailability?.requestedQty ?? row.requestedQty}).`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* Modal de Seleção em Lote */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-2xl flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Selecionar Itens do Estoque</DialogTitle>
            <DialogDescription>
              Pesquise e defina as quantidades de múltiplos itens em lote.
            </DialogDescription>
          </DialogHeader>

          {/* Área de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 py-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar itens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>
            <Button
              type="button"
              variant={showOnlySelected ? "secondary" : "outline"}
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              className="h-9 shrink-0 gap-1.5"
            >
              Ver selecionados ({totalSelectedItemsCount})
            </Button>
          </div>

          {/* Lista de Itens do Estoque */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 my-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                Nenhum item encontrado.
              </div>
            ) : (
              filteredItems.map((item) => {
                const qty = tempQuantities[item.id] ?? 0;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      qty > 0 ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-4">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Estoque: {item.currentQty} {item.unit}
                        </Badge>
                        {item.location && (
                          <span className="text-xs text-muted-foreground">
                            Local: {item.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {qty === 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 hover:border-primary hover:bg-primary/5"
                          onClick={() => handleQtyChange(item.id, Math.max(1, item.currentQty))}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-background border rounded-md shadow-xs p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-sm hover:bg-muted text-muted-foreground"
                            onClick={() => handleQtyChange(item.id, qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={qty}
                            className="h-7 w-12 text-center text-xs p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              handleQtyChange(item.id, isNaN(parsed) ? 1 : Math.max(1, parsed));
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-sm hover:bg-muted text-muted-foreground"
                            onClick={() => handleQtyChange(item.id, qty + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Confirmar ({totalSelectedItemsCount} {totalSelectedItemsCount === 1 ? "item" : "itens"})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
