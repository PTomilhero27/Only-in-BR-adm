"use client";

/**
 * MarketplaceSlotPanel
 *
 * Painel lateral (drawer) que aparece ao clicar num BOOTH_SLOT
 * no modo operacional. Permite ao admin gerenciar:
 * - Status comercial (Disponível, Reservado, Confirmado, Bloqueado)
 * - Preço do slot
 * - Listar interesses e reservas do slot
 * - Ações sobre interesses (Contatar, Negociar, Converter, Dispensar)
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toast";
import {
  useUpdateSlotPriceMutation,
  useUpdateSlotStatusMutation,
  useBlockSlotMutation,
  useUnblockSlotMutation,
  useMarketplaceInterestsQuery,
  useMarketplaceReservationsQuery,
  useUpdateInterestStatusMutation,
} from "@/app/modules/marketplace/marketplace.queries";
import type {
  MarketplaceSlotStatus,
  MarketplaceInterestStatus,
} from "@/app/modules/marketplace/marketplace.schema";

// ───────────────────────── Status badge helpers ─────────────────────────

const SLOT_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  CONFIRMED: "Confirmado",
  BLOCKED: "Bloqueado",
};

const SLOT_STATUS_VARIANT: Record<string, string> = {
  AVAILABLE: "bg-yellow-100 text-yellow-800 border-yellow-300",
  RESERVED: "bg-blue-100 text-blue-800 border-blue-300",
  CONFIRMED: "bg-green-100 text-green-800 border-green-300",
  BLOCKED: "bg-red-100 text-red-800 border-red-300",
};

const INTEREST_STATUS_LABEL: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
  NEGOTIATING: "Negociando",
  CONVERTED: "Convertido",
  DISMISSED: "Dispensado",
  EXPIRED: "Expirado",
};

const INTEREST_STATUS_VARIANT: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800 border-amber-300",
  CONTACTED: "bg-sky-100 text-sky-800 border-sky-300",
  NEGOTIATING: "bg-violet-100 text-violet-800 border-violet-300",
  CONVERTED: "bg-green-100 text-green-800 border-green-300",
  DISMISSED: "bg-gray-100 text-gray-800 border-gray-300",
  EXPIRED: "bg-red-100 text-red-800 border-red-300",
};

const RESERVATION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  EXPIRED: "Expirada",
  CANCELLED: "Cancelada",
  CONVERTED: "Convertida",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ───────────────────────── Props ─────────────────────────

type SlotInfo = {
  id: string;
  fairMapElementId: string;
  commercialStatus: string;
  priceCents: number;
  code?: string | null;
  label?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fairId: string;
  slotInfo: SlotInfo | null;
  boothNumber?: number | null;
};

// ───────────────────────── Component ─────────────────────────

export function MarketplaceSlotPanel({
  open,
  onOpenChange,
  fairId,
  slotInfo,
  boothNumber,
}: Props) {
  const [priceInput, setPriceInput] = React.useState("");

  // Sync price input when slotInfo changes
  React.useEffect(() => {
    if (slotInfo) {
      setPriceInput(String((slotInfo.priceCents / 100).toFixed(2)));
    }
  }, [slotInfo?.id, slotInfo?.priceCents]);

  // Queries
  const interestsQuery = useMarketplaceInterestsQuery(fairId, open);
  const reservationsQuery = useMarketplaceReservationsQuery(fairId, open);

  // Mutations
  const updatePrice = useUpdateSlotPriceMutation(fairId);
  const updateStatus = useUpdateSlotStatusMutation(fairId);
  const blockSlot = useBlockSlotMutation(fairId);
  const unblockSlot = useUnblockSlotMutation(fairId);
  const updateInterest = useUpdateInterestStatusMutation(fairId);

  // Filter interests/reservations for this slot
  const slotInterests = React.useMemo(() => {
    if (!slotInfo || !interestsQuery.data) return [];
    return interestsQuery.data.filter(
      (i) => i.fairMapSlotId === slotInfo.id,
    );
  }, [interestsQuery.data, slotInfo]);

  const slotReservations = React.useMemo(() => {
    if (!slotInfo || !reservationsQuery.data) return [];
    return reservationsQuery.data.filter(
      (r) => r.fairMapSlotId === slotInfo.id,
    );
  }, [reservationsQuery.data, slotInfo]);

  if (!slotInfo) return null;

  const status = slotInfo.commercialStatus;

  const handleSavePrice = () => {
    const cents = Math.round(parseFloat(priceInput.replace(",", ".")) * 100);
    if (isNaN(cents) || cents < 0) {
      toast.error({ title: "Preço inválido" });
      return;
    }
    updatePrice.mutate(
      { slotId: slotInfo.id, priceCents: cents },
      {
        onSuccess: () => toast.success({ title: "Preço atualizado" }),
        onError: () => toast.error({ title: "Erro ao atualizar preço" }),
      },
    );
  };

  const handleChangeStatus = (nextStatus: MarketplaceSlotStatus) => {
    if (nextStatus === "BLOCKED") {
      blockSlot.mutate(slotInfo.id, {
        onSuccess: () => toast.success({ title: "Slot bloqueado" }),
        onError: () => toast.error({ title: "Erro ao bloquear slot" }),
      });
      return;
    }

    if (status === "BLOCKED" && nextStatus === "AVAILABLE") {
      unblockSlot.mutate(slotInfo.id, {
        onSuccess: () => toast.success({ title: "Slot desbloqueado" }),
        onError: () => toast.error({ title: "Erro ao desbloquear slot" }),
      });
      return;
    }

    updateStatus.mutate(
      { slotId: slotInfo.id, status: nextStatus },
      {
        onSuccess: () =>
          toast.success({
            title: `Status alterado para ${SLOT_STATUS_LABEL[nextStatus] ?? nextStatus}`,
          }),
        onError: () => toast.error({ title: "Erro ao alterar status" }),
      },
    );
  };

  const handleUpdateInterest = (
    interestId: string,
    nextStatus: MarketplaceInterestStatus,
  ) => {
    updateInterest.mutate(
      { interestId, status: nextStatus },
      {
        onSuccess: () =>
          toast.success({
            title: `Interesse ${INTEREST_STATUS_LABEL[nextStatus] ?? nextStatus}`,
          }),
        onError: () => toast.error({ title: "Erro ao atualizar interesse" }),
      },
    );
  };

  const slotLabel = boothNumber
    ? `Barraca #${boothNumber}`
    : slotInfo.label ?? slotInfo.code ?? "Slot";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {slotLabel}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SLOT_STATUS_VARIANT[status] ?? ""}`}
            >
              {SLOT_STATUS_LABEL[status] ?? status}
            </span>
          </DialogTitle>
          <DialogDescription>
            Gerenciar status comercial, preço e interesses deste slot.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-5 pb-4">
            {/* ───── Preço ───── */}
            <div>
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Preço
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="text"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="h-9 w-32"
                  placeholder="0,00"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSavePrice}
                  disabled={updatePrice.isPending}
                >
                  {updatePrice.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Valor atual: {formatCents(slotInfo.priceCents)}
              </p>
            </div>

            <Separator />

            {/* ───── Status ───── */}
            <div>
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Status Comercial
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    "AVAILABLE",
                    "RESERVED",
                    "CONFIRMED",
                    "BLOCKED",
                  ] as MarketplaceSlotStatus[]
                ).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={status === s ? "default" : "outline"}
                    className={`text-xs ${status === s ? "" : ""}`}
                    disabled={status === s || updateStatus.isPending || blockSlot.isPending || unblockSlot.isPending}
                    onClick={() => handleChangeStatus(s)}
                  >
                    {SLOT_STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* ───── Interesses ───── */}
            <div>
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Interesses ({slotInterests.length})
              </Label>

              {slotInterests.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhum interesse registrado para este slot.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {slotInterests.map((interest) => (
                    <div
                      key={interest.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {interest.owner?.fullName ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {interest.owner?.email ?? ""}
                            {interest.owner?.phone
                              ? ` • ${interest.owner.phone}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${INTEREST_STATUS_VARIANT[interest.status] ?? ""}`}
                        >
                          {INTEREST_STATUS_LABEL[interest.status] ??
                            interest.status}
                        </span>
                      </div>

                      {interest.message ? (
                        <p className="text-xs text-muted-foreground italic">
                          &ldquo;{interest.message}&rdquo;
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Criado: {formatDate(interest.createdAt)}</span>
                        {interest.expiresAt ? (
                          <span>Expira: {formatDate(interest.expiresAt)}</span>
                        ) : null}
                      </div>

                      {/* Ações por interesse */}
                      {interest.status !== "CONVERTED" &&
                      interest.status !== "DISMISSED" &&
                      interest.status !== "EXPIRED" ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {interest.status === "NEW" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                handleUpdateInterest(
                                  interest.id,
                                  "CONTACTED",
                                )
                              }
                              disabled={updateInterest.isPending}
                            >
                              Marcar Contatado
                            </Button>
                          ) : null}

                          {interest.status === "NEW" ||
                          interest.status === "CONTACTED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                handleUpdateInterest(
                                  interest.id,
                                  "NEGOTIATING",
                                )
                              }
                              disabled={updateInterest.isPending}
                            >
                              Iniciar Negociação
                            </Button>
                          ) : null}

                          {interest.status === "NEGOTIATING" ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              onClick={() =>
                                handleUpdateInterest(
                                  interest.id,
                                  "CONVERTED",
                                )
                              }
                              disabled={updateInterest.isPending}
                            >
                              Confirmar Venda
                            </Button>
                          ) : null}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                            onClick={() =>
                              handleUpdateInterest(interest.id, "DISMISSED")
                            }
                            disabled={updateInterest.isPending}
                          >
                            Dispensar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* ───── Reservas ───── */}
            <div>
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Reservas ({slotReservations.length})
              </Label>

              {slotReservations.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhuma reserva registrada para este slot.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {slotReservations.map((res) => (
                    <div
                      key={res.id}
                      className="rounded-lg border p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {res.owner?.fullName ?? "—"}
                        </p>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            res.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : res.status === "EXPIRED"
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-gray-100 text-gray-800 border-gray-300"
                          }`}
                        >
                          {RESERVATION_STATUS_LABEL[res.status] ?? res.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Criada: {formatDate(res.createdAt)}</span>
                        {res.expiresAt ? (
                          <span>Expira: {formatDate(res.expiresAt)}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
