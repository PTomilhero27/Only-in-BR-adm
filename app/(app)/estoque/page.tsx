"use client";

/**
 * Página principal de Estoque / Armazenagem (Unificada).
 *
 * Responsabilidade:
 * - Reunir em abas (Tabs) a gestão de itens em estoque, histórico de movimentações e reservas.
 * - Gerenciar todos os modais de ação do estoque de forma centralizada e clean.
 * - Fornecer filtros inteligentes e responsivos para cada aba.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  FileSpreadsheet,
  MinusCircle,
  Plus,
  PlusCircle,
  RotateCcw,
  Sliders,
  FolderOpen,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";

// Componentes do módulo de estoque
import { InventoryDashboardCards } from "@/app/modules/inventory/components/inventory-dashboard-cards";
import { InventoryEmptyState } from "@/app/modules/inventory/components/inventory-empty-state";
import { InventoryFiltersBar } from "@/app/modules/inventory/components/inventory-filters-bar";
import { InventoryImportDialog } from "@/app/modules/inventory/components/inventory-import-dialog";
import { InventoryItemDetailsDialog } from "@/app/modules/inventory/components/inventory-item-details-dialog";
import { InventoryItemUpsertDialog } from "@/app/modules/inventory/components/inventory-item-upsert-dialog";
import { InventoryItemsTable } from "@/app/modules/inventory/components/inventory-items-table";
import { InventoryLoadingSkeleton } from "@/app/modules/inventory/components/inventory-loading-skeleton";
import { InventoryMovementDialog } from "@/app/modules/inventory/components/inventory-movement-dialog";
import { ManageCategoriesDialog } from "@/app/modules/inventory/components/manage-categories-dialog";

// Componentes das reservas
import { ApproveReservationDialog } from "@/app/modules/inventory/components/approve-reservation-dialog";
import { CancelReservationDialog } from "@/app/modules/inventory/components/cancel-reservation-dialog";
import { InventoryReservationCreateDialog } from "@/app/modules/inventory/components/inventory-reservation-create-dialog";
import { InventoryReservationDetailsDialog } from "@/app/modules/inventory/components/inventory-reservation-details-dialog";
import { InventoryReservationsTable } from "@/app/modules/inventory/components/inventory-reservations-table";
import { PickupReservationDialog } from "@/app/modules/inventory/components/pickup-reservation-dialog";
import { ReturnItemsDialog } from "@/app/modules/inventory/components/return-items-dialog";

// Hooks e Tipagem
import {
  useInventoryItemsQuery,
  useInventoryMovementsQuery,
  useInventoryReservationsQuery,
  useReturnManualMovementMutation,
} from "@/app/modules/inventory/inventory.queries";
import {
  inventoryMovementTypeLabels,
  type InventoryItem,
  type InventoryItemStatus,
  type InventoryMovementType,
  type InventoryReservation,
  type InventoryReservationStatus,
  type InventoryMovement,
} from "@/app/modules/inventory/types";
import { cn } from "@/lib/utils";

// Mapeamentos para a visualização de movimentações
const typeIcons: Record<InventoryMovementType, React.ReactNode> = {
  IN: <PlusCircle className="h-5 w-5 text-emerald-600" />,
  OUT: <MinusCircle className="h-5 w-5 text-red-600" />,
  RETURN: <RotateCcw className="h-5 w-5 text-sky-600" />,
  LOSS: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  ADJUSTMENT: <Sliders className="h-5 w-5 text-violet-600" />,
  DAMAGE: <AlertTriangle className="h-5 w-5 text-orange-600" />,
};

const typeBgColors: Record<InventoryMovementType, string> = {
  IN: "bg-emerald-50 border-emerald-200",
  OUT: "bg-red-50 border-red-200",
  RETURN: "bg-sky-50 border-sky-200",
  LOSS: "bg-amber-50 border-amber-200",
  ADJUSTMENT: "bg-violet-50 border-violet-200",
  DAMAGE: "bg-orange-50 border-orange-200",
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("items");

  // --- Estados do Estoque (Itens) ---
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemStatus, setItemStatus] = useState<InventoryItemStatus | "ALL">("ALL");
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // --- Estados das Reservas ---
  const [resSearch, setResSearch] = useState("");
  const [resStatus, setResStatus] = useState<InventoryReservationStatus | "ALL">("ALL");
  const [resFairId, setResFairId] = useState("");
  const [resFrom, setResFrom] = useState("");
  const [resTo, setResTo] = useState("");
  const [reservationFilter, setReservationFilter] = useState<"ALL" | "IN_PROGRESS" | "FUTURE" | "CONCLUDED">("ALL");
  const [createReservationOpen, setCreateReservationOpen] = useState(false);
  const [detailsReservation, setDetailsReservation] = useState<InventoryReservation | null>(null);
  const [approveReservation, setApproveReservation] = useState<InventoryReservation | null>(null);
  const [pickupReservation, setPickupReservation] = useState<InventoryReservation | null>(null);
  const [returnReservation, setReturnReservation] = useState<InventoryReservation | null>(null);
  const [cancelReservation, setCancelReservation] = useState<InventoryReservation | null>(null);

  // --- Estados do Histórico de Movimentações ---
  const [movItemId, setMovItemId] = useState("");
  const [movType, setMovType] = useState<InventoryMovementType | "ALL">("ALL");
  const [movFairId, setMovFairId] = useState("");
  const [movFrom, setMovFrom] = useState("");
  const [movTo, setMovTo] = useState("");
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);

  // --- Estados de Devolução de Saída Manual ---
  const [manualReturnOpen, setManualReturnOpen] = useState(false);
  const [selectedReturnMovement, setSelectedReturnMovement] = useState<InventoryMovement | null>(null);
  const [returnQtyInput, setReturnQtyInput] = useState("1");
  const returnManualMutation = useReturnManualMovementMutation();

  // --- Queries (Carregamento de Dados) ---
  const itemParams = useMemo(
    () => ({
      search: itemSearch.trim() || undefined,
      category: itemCategory.trim() || undefined,
      status: itemStatus,
      perPage: 9999,
    }),
    [itemCategory, itemSearch, itemStatus],
  );
  const { data: itemsResponse, isLoading: itemsLoading } = useInventoryItemsQuery(itemParams);
  const items = itemsResponse?.data ?? [];

  const resParams = useMemo(
    () => ({
      search: resSearch.trim() || undefined,
      status: resStatus,
      fairId: resFairId.trim() || undefined,
      pickupFrom: resFrom || undefined,
      pickupTo: resTo || undefined,
    }),
    [resFairId, resFrom, resSearch, resStatus, resTo],
  );
  const { data: reservationsResponse, isLoading: reservationsLoading } = useInventoryReservationsQuery(resParams);
  const reservations = reservationsResponse?.data ?? [];

  // Query para buscar lista completa de itens para o modal de criação de reserva
  const { data: rawItemsData } = useInventoryItemsQuery({ perPage: 9999 });
  const allItemsForReservation = rawItemsData?.data ?? [];

  const movParams = useMemo(
    () => ({
      itemId: movItemId.trim() || undefined,
      type: movType,
      fairId: movFairId.trim() || undefined,
      from: movFrom || undefined,
      to: movTo || undefined,
    }),
    [movFairId, movFrom, movItemId, movTo, movType],
  );
  const { data: movementsResponse, isLoading: movementsLoading } = useInventoryMovementsQuery(movParams);
  const movements = movementsResponse?.data ?? [];

  // --- Filtragem Client-Side de Reservas (Concluídas, Futuras, Em Andamento) ---
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (reservationFilter === "ALL") return true;
      if (reservationFilter === "IN_PROGRESS") {
        return ["SEPARATING", "READY_FOR_PICKUP", "PICKED_UP", "PARTIALLY_RETURNED"].includes(r.status);
      }
      if (reservationFilter === "FUTURE") {
        return ["PENDING", "APPROVED"].includes(r.status);
      }
      if (reservationFilter === "CONCLUDED") {
        return ["RETURNED", "CANCELLED"].includes(r.status);
      }
      return true;
    });
  }, [reservations, reservationFilter]);

  return (
    <div className="bg-white px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Estoque" },
          ]}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Estoque / Armazenagem</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe itens em estoque, movimentações realizadas e reservas de materiais.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === "items" && (
              <>
                <Button onClick={() => setUpsertOpen(true)} className="shadow-[0_8px_16px_-8px_rgba(1,0,119,0.4)]">
                  <Plus className="h-4 w-4" />
                  Adicionar item
                </Button>
                <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
                  <FolderOpen className="h-4 w-4" />
                  Categorias
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar planilha
                </Button>
              </>
            )}
            {activeTab === "reservations" && (
              <Button onClick={() => setCreateReservationOpen(true)} className="shadow-[0_8px_16px_-8px_rgba(1,0,119,0.4)]">
                <Plus className="h-4 w-4" />
                Nova reserva
              </Button>
            )}
            {activeTab === "movements" && (
              <Button variant="outline" onClick={() => setMovementItem(items[0] ?? null)} disabled={!items.length}>
                <RotateCcw className="h-4 w-4" />
                Nova movimentação
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="space-y-3 w-full">
            {/* Faixa de cor da identidade visual: Amarelo, Verde e Azul */}
            <div className="h-1 w-full bg-gradient-to-r from-[#f5bd2c] via-[#196132] to-[#010077] rounded-full opacity-90 shadow-sm" />
            
            <TabsList className="w-full justify-start border-b border-border/60 bg-transparent p-0 rounded-none h-12 shadow-none">
              <TabsTrigger
                value="items"
                className="relative rounded-none border-0 data-[state=active]:bg-transparent px-5 h-full font-semibold text-sm text-slate-500 data-[state=active]:text-[#010077] shadow-none data-[state=active]:shadow-none transition-all duration-200 hover:text-slate-800 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-[#f5bd2c] data-[state=active]:after:via-[#196132] data-[state=active]:after:to-[#010077] data-[state=active]:after:rounded-full"
              >
                Itens no Estoque ({items.length})
              </TabsTrigger>
              <TabsTrigger
                value="reservations"
                className="relative rounded-none border-0 data-[state=active]:bg-transparent px-5 h-full font-semibold text-sm text-slate-500 data-[state=active]:text-[#010077] shadow-none data-[state=active]:shadow-none transition-all duration-200 hover:text-slate-800 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-[#f5bd2c] data-[state=active]:after:via-[#196132] data-[state=active]:after:to-[#010077] data-[state=active]:after:rounded-full"
              >
                Reservas
              </TabsTrigger>
              <TabsTrigger
                value="movements"
                className="relative rounded-none border-0 data-[state=active]:bg-transparent px-5 h-full font-semibold text-sm text-slate-500 data-[state=active]:text-[#010077] shadow-none data-[state=active]:shadow-none transition-all duration-200 hover:text-slate-800 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[3px] data-[state=active]:after:bg-gradient-to-r data-[state=active]:after:from-[#f5bd2c] data-[state=active]:after:via-[#196132] data-[state=active]:after:to-[#010077] data-[state=active]:after:rounded-full"
              >
                Histórico de Movimentações
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="items" className="space-y-6 outline-none">
            <InventoryDashboardCards items={items} />

            <InventoryFiltersBar
              search={itemSearch}
              onSearchChange={setItemSearch}
              category={itemCategory}
              onCategoryChange={setItemCategory}
              itemStatus={itemStatus}
              onItemStatusChange={setItemStatus}
            />

            {itemsLoading ? (
              <InventoryLoadingSkeleton />
            ) : items.length ? (
              <InventoryItemsTable
                items={items}
                onView={setDetailsItem}
                onEdit={(item) => {
                  setEditItem(item);
                  setUpsertOpen(true);
                }}
                onMovement={setMovementItem}
              />
            ) : (
              <InventoryEmptyState />
            )}
          </TabsContent>

          <TabsContent value="reservations" className="space-y-6 outline-none">
            {/* Segmented control para filtragem visual das reservas */}
            <div className="flex flex-wrap gap-2 border-b border-border/60 pb-4">
              {[
                { value: "ALL", label: "Todas as reservas" },
                { value: "IN_PROGRESS", label: "Em andamento" },
                { value: "FUTURE", label: "Futuras" },
                { value: "CONCLUDED", label: "Concluídas" },
              ].map((tab) => (
                <Button
                  key={tab.value}
                  variant={reservationFilter === tab.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReservationFilter(tab.value as any)}
                  className="rounded-full px-4"
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <InventoryFiltersBar
              search={resSearch}
              onSearchChange={setResSearch}
              reservationStatus={resStatus}
              onReservationStatusChange={setResStatus}
              fairId={resFairId}
              onFairIdChange={setResFairId}
              from={resFrom}
              to={resTo}
              onFromChange={setResFrom}
              onToChange={setResTo}
            />

            {reservationsLoading ? (
              <InventoryLoadingSkeleton />
            ) : filteredReservations.length ? (
              <InventoryReservationsTable
                reservations={filteredReservations}
                onView={setDetailsReservation}
                onApprove={setApproveReservation}
                onPickup={setPickupReservation}
                onReturn={setReturnReservation}
                onCancel={setCancelReservation}
              />
            ) : (
              <InventoryEmptyState
                title="Nenhuma reserva encontrada"
                description="Crie uma reserva ou altere os filtros selecionados."
              />
            )}
          </TabsContent>

          <TabsContent value="movements" className="space-y-6 outline-none">
            <InventoryFiltersBar
              search={movItemId}
              onSearchChange={setMovItemId}
              movementType={movType}
              onMovementTypeChange={setMovType}
              fairId={movFairId}
              onFairIdChange={setMovFairId}
              from={movFrom}
              to={movTo}
              onFromChange={setMovFrom}
              onToChange={setMovTo}
            />

            {movementsLoading ? (
              <InventoryLoadingSkeleton />
            ) : movements.length ? (
              <div className="grid gap-3">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 shadow-sm hover:border-primary/20 transition duration-200"
                  >
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full border",
                        typeBgColors[movement.type],
                      )}
                    >
                      {typeIcons[movement.type]}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-primary">
                            {inventoryMovementTypeLabels[movement.type]} de {movement.quantity}x{" "}
                            {movement.itemName ?? movement.item?.name ?? "-"}
                          </h4>
                          {movement.requiresReturn && (
                            <>
                              {movement.returnedQty === 0 ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-normal text-xs">
                                  Devolução Pendente
                                </Badge>
                              ) : (movement.returnedQty ?? 0) < movement.quantity ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-normal text-xs">
                                  Devolvido parcialmente ({movement.returnedQty}/{movement.quantity})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal text-xs">
                                  Devolução Concluída
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {movement.createdAt ? new Date(movement.createdAt).toLocaleString("pt-BR") : "-"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {movement.createdByName ? `Registrado por: ${movement.createdByName}` : ""}
                        {movement.responsibleName ? ` • Retirado por: ${movement.responsibleName}` : ""}
                        {movement.fairName || movement.purpose
                          ? ` • Evento/Finalidade: ${movement.fairName ?? movement.purpose}`
                          : ""}
                      </p>
                      {movement.notes && (
                        <div className="mt-2 rounded-md bg-muted/40 p-2.5 text-xs italic text-muted-foreground border-l-2 border-border">
                          "{movement.notes}"
                        </div>
                      )}
                      {movement.requiresReturn && (movement.returnedQty ?? 0) < movement.quantity && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-primary/30 hover:border-primary hover:bg-primary/5 text-primary gap-1"
                            onClick={() => {
                              setSelectedReturnMovement(movement);
                              setReturnQtyInput(String(movement.quantity - (movement.returnedQty ?? 0)));
                              setManualReturnOpen(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Registrar devolução
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <InventoryEmptyState
                title="Nenhuma movimentação encontrada"
                description="Entradas, saídas, devoluções e ajustes do estoque aparecerão aqui."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais / Dialogs de Operações */}
      <InventoryItemUpsertDialog
        open={upsertOpen}
        onOpenChange={(open) => {
          setUpsertOpen(open);
          if (!open) setEditItem(null);
        }}
        item={editItem}
      />
      <InventoryItemDetailsDialog
        open={!!detailsItem}
        onOpenChange={(open) => !open && setDetailsItem(null)}
        item={detailsItem}
      />
      <InventoryMovementDialog
        open={!!movementItem}
        onOpenChange={(open) => !open && setMovementItem(null)}
        item={movementItem}
      />
      <ManageCategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
      />
      <InventoryImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <InventoryReservationCreateDialog
        open={createReservationOpen}
        onOpenChange={setCreateReservationOpen}
        items={allItemsForReservation}
      />
      <InventoryReservationDetailsDialog
        open={!!detailsReservation}
        onOpenChange={(open) => !open && setDetailsReservation(null)}
        reservation={detailsReservation}
      />
      <ApproveReservationDialog
        open={!!approveReservation}
        onOpenChange={(open) => !open && setApproveReservation(null)}
        reservation={approveReservation}
      />
      <PickupReservationDialog
        open={!!pickupReservation}
        onOpenChange={(open) => !open && setPickupReservation(null)}
        reservation={pickupReservation}
      />
      <ReturnItemsDialog
        open={!!returnReservation}
        onOpenChange={(open) => !open && setReturnReservation(null)}
        reservation={returnReservation}
      />
      <CancelReservationDialog
        open={!!cancelReservation}
        onOpenChange={(open) => !open && setCancelReservation(null)}
        reservation={cancelReservation}
      />

      {/* Dialog de Devolução de Saída Manual */}
      <Dialog open={manualReturnOpen} onOpenChange={setManualReturnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar devolução manual</DialogTitle>
            <DialogDescription>
              Informe a quantidade a ser devolvida para o estoque.
            </DialogDescription>
          </DialogHeader>

          {selectedReturnMovement && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-slate-50 p-3.5 text-sm space-y-1.5 border border-border">
                <p className="text-slate-600">
                  <strong>Item:</strong> {selectedReturnMovement.itemName ?? "-"}
                </p>
                <p className="text-slate-600">
                  <strong>Quantidade retirada:</strong> {selectedReturnMovement.quantity} unidades
                </p>
                <p className="text-slate-600">
                  <strong>Já devolvido:</strong> {selectedReturnMovement.returnedQty ?? 0} unidades
                </p>
                <p className="text-slate-700 font-medium pt-1 border-t">
                  <strong>Pendente:</strong> {selectedReturnMovement.quantity - (selectedReturnMovement.returnedQty ?? 0)} unidades
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnQty">Quantidade a devolver</Label>
                <Input
                  id="returnQty"
                  type="number"
                  min={1}
                  value={returnQtyInput}
                  onChange={(e) => setReturnQtyInput(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setManualReturnOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              disabled={returnManualMutation.isPending || !selectedReturnMovement}
              onClick={async () => {
                if (!selectedReturnMovement) return;
                const qty = Number(returnQtyInput);
                if (!Number.isInteger(qty) || qty <= 0) {
                  toast.warning({ title: "Informe uma quantidade válida (inteira e maior que zero)." });
                  return;
                }

                try {
                  await returnManualMutation.mutateAsync({
                    id: selectedReturnMovement.id,
                    quantity: qty,
                    finalize: true,
                  });
                  toast.success({ title: "Devolução concluída com sucesso" });
                  setManualReturnOpen(false);
                } catch (err) {
                  toast.error({
                    title: "Erro ao concluir devolução",
                    subtitle: getErrorMessage(err),
                  });
                }
              }}
            >
              Concluir devolução
            </Button>
            <Button
              disabled={returnManualMutation.isPending || !selectedReturnMovement}
              onClick={async () => {
                if (!selectedReturnMovement) return;
                const qty = Number(returnQtyInput);
                if (!Number.isInteger(qty) || qty <= 0) {
                  toast.warning({ title: "Informe uma quantidade válida (inteira e maior que zero)." });
                  return;
                }

                try {
                  await returnManualMutation.mutateAsync({
                    id: selectedReturnMovement.id,
                    quantity: qty,
                    finalize: false,
                  });
                  toast.success({ title: "Devolução registrada com sucesso" });
                  setManualReturnOpen(false);
                } catch (err) {
                  toast.error({
                    title: "Erro ao registrar devolução",
                    subtitle: getErrorMessage(err),
                  });
                }
              }}
            >
              {returnManualMutation.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
