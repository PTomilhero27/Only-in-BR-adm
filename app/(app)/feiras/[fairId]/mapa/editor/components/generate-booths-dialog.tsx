"use client";

/**
 * GenerateBoothsDialog
 *
 * UI-only: coleta parâmetros e devolve valores validados.
 * - Inputs são controlados como STRING para evitar bugs do type="number"
 * - Confirm devolve INTEIROS
 */

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Mode = "HORIZONTAL" | "VERTICAL" | "AUTO";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  defaultQty: number;
  defaultBoothSize: number;
  defaultGap: number;
  defaultMode: Mode;

  onConfirm: (payload: { qty: number; boothSize: number; gap: number; mode: Mode }) => void;
};

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function digitsOnly(next: string) {
  return next.replace(/[^\d]/g, "");
}

function toIntOrFallback(v: string, fallback: number, min: number, max: number) {
  if (!v) return clampInt(fallback, min, max);
  return clampInt(Number(v), min, max);
}

export function GenerateBoothsDialog({
  open,
  onOpenChange,
  defaultQty,
  defaultBoothSize,
  defaultGap,
  defaultMode,
  onConfirm,
}: Props) {
  // ✅ strings (evita bugs do input number)
  const [qty, setQty] = React.useState(String(defaultQty));
  const [boothSize, setBoothSize] = React.useState(String(defaultBoothSize));
  const [gap, setGap] = React.useState(String(defaultGap));
  const [mode, setMode] = React.useState<Mode>(defaultMode);

  React.useEffect(() => {
    if (!open) return;
    setQty(String(defaultQty));
    setBoothSize(String(defaultBoothSize));
    setGap(String(defaultGap));
    setMode(defaultMode);
  }, [open, defaultQty, defaultBoothSize, defaultGap, defaultMode]);

  const qtyN = toIntOrFallback(qty, defaultQty, 1, 500);
  const boothSizeN = toIntOrFallback(boothSize, defaultBoothSize, 20, 400);
  const gapN = toIntOrFallback(gap, defaultGap, 0, 200);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar barracas na área</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
            Defina a quantidade e o tamanho do slot. A área selecionada pode ser expandida automaticamente para caber certinho.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={qty}
                onChange={(e) => setQty(digitsOnly(e.target.value))}
                onBlur={() => setQty(String(qtyN))}
                placeholder="ex: 6"
              />
              <p className="text-[11px] text-muted-foreground">1 a 500</p>
            </div>

            <div className="space-y-2">
              <Label>Tamanho do slot (px)</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={boothSize}
                onChange={(e) => setBoothSize(digitsOnly(e.target.value))}
                onBlur={() => setBoothSize(String(boothSizeN))}
                placeholder="ex: 70"
              />
              <p className="text-[11px] text-muted-foreground">20 a 400</p>
            </div>

            <div className="space-y-2">
              <Label>Espaçamento (gap)</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={gap}
                onChange={(e) => setGap(digitsOnly(e.target.value))}
                onBlur={() => setGap(String(gapN))}
                placeholder="ex: 8"
              />
              <p className="text-[11px] text-muted-foreground">0 a 200</p>
            </div>

            <div className="space-y-2">
              <Label>Orientação</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid gap-2">
                <label className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <RadioGroupItem value="HORIZONTAL" />
                  Horizontal
                </label>
                <label className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <RadioGroupItem value="VERTICAL" />
                  Vertical
                </label>
                <label className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <RadioGroupItem value="AUTO" />
                  Automático
                </label>
              </RadioGroup>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Prévia</div>
            <div className="mt-1">
              {qtyN} slots • {boothSizeN}px • gap {gapN}px • {mode.toLowerCase()}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button
            onClick={() => {
              onConfirm({ qty: qtyN, boothSize: boothSizeN, gap: gapN, mode });
              onOpenChange(false);
            }}
          >
            Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}