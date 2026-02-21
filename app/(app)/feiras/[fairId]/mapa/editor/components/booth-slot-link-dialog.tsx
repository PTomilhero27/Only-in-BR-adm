"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { useAvailableStallFairsQuery, useLinkBoothSlotMutation } from "@/app/modules/fair-maps/fair-maps.queries";

/**
 * BoothSlotLinkDialog
 *
 * Modal operacional para vincular/desvincular uma barraca (StallFair) a um slot (BOOTH_SLOT).
 *
 * UX:
 * - Se já está vinculado: exibe infos + botão "Desvincular"
 * - Se está livre: exibe autocomplete das opções + botão "Vincular"
 */
export function BoothSlotLinkDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  fairId: string;
  slotClientKey: string | null;

  linked:
    | {
        slotClientKey: string;
        stallFairId: string;
        stallFair?: {
          id: string;
          stallPdvName: string;
          stallSize: string;
          ownerName: string;
          ownerPhone?: string | null;
        } | null;
      }
    | null;
}) {
  const { open, onOpenChange, fairId, slotClientKey, linked } = props;

  const linkMutation = useLinkBoothSlotMutation(fairId);

  // Só busca opções quando:
  // - modal aberto
  // - existe slot
  // - slot está livre (sem vínculo)
  const available = useAvailableStallFairsQuery(fairId, open && !!slotClientKey && !linked);

  const [selectedStallFairId, setSelectedStallFairId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setSelectedStallFairId(null);
  }, [open]);

  async function handleUnlink() {
    if (!slotClientKey) return;
    await linkMutation.mutateAsync({ slotClientKey, input: { stallFairId: null } });
    onOpenChange(false);
  }

  async function handleLink() {
    if (!slotClientKey || !selectedStallFairId) return;
    await linkMutation.mutateAsync({ slotClientKey, input: { stallFairId: selectedStallFairId } });
    onOpenChange(false);
  }

  const canSubmitLink = !!slotClientKey && !!selectedStallFairId && !linkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {linked ? "Barraca vinculada" : "Vincular barraca ao slot"}
          </DialogTitle>
        </DialogHeader>

        {!slotClientKey ? (
          <div className="text-sm text-muted-foreground">
            Selecione um slot no mapa.
          </div>
        ) : linked ? (
          <div className="space-y-4">
            <div className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {linked.stallFair?.stallPdvName ?? "Barraca"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {linked.stallFair?.ownerName ?? "—"}
                    {linked.stallFair?.ownerPhone ? ` • ${linked.stallFair.ownerPhone}` : ""}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    StallFairId: <span className="font-mono">{linked.stallFairId}</span>
                  </div>
                </div>

                <Badge variant="secondary">
                  {linked.stallFair?.stallSize ?? "—"}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>

              <Button variant="destructive" onClick={handleUnlink} disabled={linkMutation.isPending}>
                {linkMutation.isPending ? "Desvinculando..." : "Desvincular"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium mb-2">
                Selecione a barraca (StallFair) disponível
              </div>

              {available.isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando opções…</div>
              ) : available.isError ? (
                <div className="text-sm text-destructive">Erro ao carregar opções.</div>
              ) : (
                <Command>
                  <CommandInput placeholder="Buscar por barraca ou expositor..." />
                  <CommandList className="max-h-64">
                    <CommandEmpty>Nenhuma barraca disponível.</CommandEmpty>

                    <CommandGroup heading="Disponíveis (sem vínculo)">
                      {(available.data as any[])?.map((sf) => (
                        <CommandItem
                          key={sf.id}
                          value={`${sf.stallPdvName} ${sf.ownerName} ${sf.stallSize}`}
                          onSelect={() => setSelectedStallFairId(sf.id)}
                        >
                          <div className="flex w-full items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{sf.stallPdvName}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {sf.ownerName}
                                {sf.ownerPhone ? ` • ${sf.ownerPhone}` : ""}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{sf.stallSize}</Badge>
                              {selectedStallFairId === sf.id ? (
                                <Badge className="bg-emerald-200 text-black hover:bg-emerald-200">
                                  Selecionada
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>

              <Button onClick={handleLink} disabled={!canSubmitLink}>
                {linkMutation.isPending ? "Vinculando..." : "Vincular"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}