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
  Plus,
  Trash2,
  AlertTriangle,
  MessageCircle,
  Clock,
} from "lucide-react";
import { useGlobalFair } from "../../../components/global-fair-provider";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUpdateSlotPriceMutation,
  useUpdateSlotStatusMutation,
  useBlockSlotMutation,
  useUnblockSlotMutation,
  useMarketplaceInterestsQuery,
  useMarketplaceReservationsQuery,
  useUpdateInterestStatusMutation,
  useUpdateSlotTentTypesMutation,
} from "@/app/modules/marketplace/marketplace.queries";
import { ConfirmMarketplaceReservationDialog } from "@/app/modules/marketplace/components/confirm-reservation/confirm-marketplace-reservation-dialog";
import type {
  MarketplaceReservation,
  MarketplaceSlotStatus,
  MarketplaceInterestStatus,
} from "@/app/modules/marketplace/marketplace.schema";
import {
  type StallSize,
  StallSizeSchema,
  stallSizeLabel,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema";

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

const ALL_STALL_SIZES = StallSizeSchema.options;

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
  allowedTentTypes?: Array<{ tentType: StallSize; priceCents: number }>;
  reservations?: Array<{
    ownerName: string;
    ownerPhone: string;
    selectedTentType: StallSize | null;
    expiresAt: string | null;
  }>;
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
  const { fair } = useGlobalFair();
  const [priceInput, setPriceInput] = React.useState("");
  const [confirmReservation, setConfirmReservation] =
    React.useState<MarketplaceReservation | null>(null);

  // Estado para gerenciar tipos de barraca permitidos localmente
  const [tentConfigs, setTentConfigs] = React.useState<
    Array<{ tentType: StallSize; priceCents: number }>
  >([]);

  // Sync state when slotInfo changes
  React.useEffect(() => {
    if (slotInfo) {
      setPriceInput(String((slotInfo.priceCents / 100).toFixed(2)));
      setTentConfigs(slotInfo.allowedTentTypes ?? []);
    }
  }, [slotInfo]);

  // Queries
  const interestsQuery = useMarketplaceInterestsQuery(fairId, open);
  const reservationsQuery = useMarketplaceReservationsQuery(fairId, open);

  // Mutations
  const updatePrice = useUpdateSlotPriceMutation(fairId);
  const updateStatus = useUpdateSlotStatusMutation(fairId);
  const blockSlot = useBlockSlotMutation(fairId);
  const unblockSlot = useUnblockSlotMutation(fairId);
  const updateInterest = useUpdateInterestStatusMutation(fairId);
  const updateTentTypes = useUpdateSlotTentTypesMutation(fairId);

  // Filter interests/reservations for this slot
  const slotInterests = React.useMemo(() => {
    if (!slotInfo || !interestsQuery.data) return [];
    return interestsQuery.data.filter((i) => i.fairMapSlotId === slotInfo.id);
  }, [interestsQuery.data, slotInfo]);

  const slotReservations = React.useMemo(() => {
    if (!slotInfo || !reservationsQuery.data) return [];
    return reservationsQuery.data.filter((r) => r.fairMapSlotId === slotInfo.id);
  }, [reservationsQuery.data, slotInfo]);

  const activeReservation = React.useMemo(
    () => slotReservations.find((reservation) => reservation.status === "ACTIVE") ?? null,
    [slotReservations],
  );

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

  const handleUpdateTentTypes = () => {
    updateTentTypes.mutate(
      { slotId: slotInfo.id, configurations: tentConfigs },
      {
        onSuccess: () =>
          toast.success({ title: "Configurações de barraca salvas" }),
        onError: () =>
          toast.error({ title: "Erro ao salvar configurações de barraca" }),
      },
    );
  };

  const addTentConfig = () => {
    const nextType = ALL_STALL_SIZES.find(
      (s) => !tentConfigs.some((c) => c.tentType === s),
    );
    if (!nextType) {
      toast.error({ title: "Todos os tipos já foram adicionados" });
      return;
    }
    setTentConfigs((prev) => [
      ...prev,
      { tentType: nextType, priceCents: slotInfo.priceCents },
    ]);
  };

  const removeTentConfig = (index: number) => {
    setTentConfigs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTentConfig = (
    index: number,
    field: "tentType" | "priceCents",
    value: any,
  ) => {
    setTentConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
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

  const slotLabelText = boothNumber
    ? `Barraca #${boothNumber}`
    : slotInfo.label ?? slotInfo.code ?? "Slot";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {slotLabelText}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SLOT_STATUS_VARIANT[status] ?? ""}`}
            >
              {SLOT_STATUS_LABEL[status] ?? status}
            </span>
          </DialogTitle>
          <DialogDescription>
            Gerenciar preços por tipo de barraca, status comercial e reservas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-5 pb-4">
            {/* ───── Destaque de Reserva Ativa ───── */}
            {status === "RESERVED" && slotInfo.reservations?.[0] && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">Reserva Ativa</h4>
                      <p className="text-[10px] text-blue-700 uppercase font-semibold tracking-wider">
                        Ação imediata recomendada
                      </p>
                    </div>
                  </div>
                  {slotInfo.reservations[0].expiresAt && (
                    <Badge variant="outline" className="border-blue-200 bg-white text-blue-700 text-[10px] h-5">
                      Expira em: {formatDate(slotInfo.reservations[0].expiresAt)}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Expositor</p>
                    <p className="text-sm font-semibold">{slotInfo.reservations[0].ownerName}</p>
                    <p className="text-xs text-muted-foreground">{slotInfo.reservations[0].ownerPhone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Tipo Escolhido</p>
                    <Badge variant="secondary" className="mt-0.5">
                      {slotInfo.reservations[0].selectedTentType
                        ? stallSizeLabel(slotInfo.reservations[0].selectedTentType)
                        : "Não definido"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <Button
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white gap-2 h-10 shadow-md transition-all active:scale-95"
                    onClick={() => {
                      const res = slotInfo.reservations![0];
                      const label = boothNumber ? `#${boothNumber}` : slotInfo.label || slotInfo.code || "Slot";
                      const fairName = fair?.name || "na feira";
                      const text = `Olá ${res.ownerName}, vimos que você realizou uma reserva para o slot ${label} na feira ${fairName}. Gostaria de confirmar os detalhes para concluirmos sua participação?`;
                      window.open(
                        `https://wa.me/55${res.ownerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
                        "_blank"
                      );
                    }}
                  >
                    <MessageCircle className="h-5 w-5 fill-current" />
                    Contatar via WhatsApp
                  </Button>

                  {activeReservation ? (
                    <Button
                      variant="outline"
                      className="w-full h-10 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setConfirmReservation(activeReservation)}
                    >
                      Confirmar reserva
                    </Button>
                  ) : null}
                </div>
              </div>
            )}

            {/* ───── Preço Base ───── */}
            <div>
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Preço Base (Mínimo)
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
              <p className="mt-1 text-[10px] text-muted-foreground">
                Valor exibido inicialmente na vitrine.
              </p>
            </div>

            <Separator />

            {/* ───── Configuração de Tipos de Barraca ───── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase text-muted-foreground">
                  Preços por Tipo de Barraca
                </Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={addTentConfig}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar Tipo
                </Button>
              </div>

              {tentConfigs.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <p>
                    Sem configurações específicas. O sistema usará o preço base
                    para todas as reservas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tentConfigs.map((config, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <Select
                        value={config.tentType}
                        onValueChange={(v) =>
                          updateTentConfig(index, "tentType", v)
                        }
                      >
                        <SelectTrigger className="h-8 flex-1 text-xs">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STALL_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>
                              {stallSizeLabel(size)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1.5 min-w-[100px]">
                        <span className="text-[10px] text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          value={(config.priceCents / 100).toFixed(0)}
                          onChange={(e) =>
                            updateTentConfig(
                              index,
                              "priceCents",
                              Math.round(parseFloat(e.target.value) * 100),
                            )
                          }
                          className="h-8 w-20 text-xs px-2"
                        />
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => removeTentConfig(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={handleUpdateTentTypes}
                      disabled={updateTentTypes.isPending}
                      className="h-8 text-xs px-4"
                    >
                      {updateTentTypes.isPending
                        ? "Salvando..."
                        : "Salvar Tipos"}
                    </Button>
                  </div>
                </div>
              )}
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
                    disabled={
                      status === s ||
                      updateStatus.isPending ||
                      blockSlot.isPending ||
                      unblockSlot.isPending
                    }
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
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {res.owner?.fullName ?? "—"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {res.selectedTentType ? (
                              <Badge
                                variant="outline"
                                className="h-4 px-1.5 text-[9px] font-normal border-blue-200 bg-blue-50 text-blue-700"
                              >
                                {stallSizeLabel(res.selectedTentType)}
                              </Badge>
                            ) : null}
                            {res.priceCents ? (
                              <span className="text-[10px] font-medium text-emerald-700">
                                {formatCents(res.priceCents)}
                              </span>
                            ) : null}
                          </div>
                        </div>
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
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-dashed">
                        <span>Criada: {formatDate(res.createdAt)}</span>
                        {res.expiresAt ? (
                          <span>Expira: {formatDate(res.expiresAt)}</span>
                        ) : null}
                      </div>

                      {res.status === "ACTIVE" ? (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => setConfirmReservation(res)}
                          >
                            Confirmar reserva
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        </DialogContent>
      </Dialog>

      <ConfirmMarketplaceReservationDialog
        open={Boolean(confirmReservation)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmReservation(null);
        }}
        fairId={fairId}
        fairName={fair?.name}
        slotLabel={slotLabelText}
        reservation={confirmReservation}
      />
    </>
  );
}
