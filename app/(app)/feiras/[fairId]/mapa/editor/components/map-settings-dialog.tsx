"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  hasBlueprint: boolean;
  isBlueprintVisible: boolean;
  onToggleBlueprint: () => void;
  onPickBlueprintFile: (file: File) => void;

  isEditMode: boolean;
  onToggleEditMode: () => void;

  boothSize: number;
  boothGap: number;
  onChangeBoothConfig: (next: { boothSize: number; gap: number }) => void;
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

export function MapSettingsDialog({
  open,
  onOpenChange,
  hasBlueprint,
  isBlueprintVisible,
  onToggleBlueprint,
  onPickBlueprintFile,
  isEditMode,
  onToggleEditMode,
  boothSize,
  boothGap,
  onChangeBoothConfig,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // ✅ strings para inputs (sem bug)
  const [sizeStr, setSizeStr] = React.useState(String(boothSize));
  const [gapStr, setGapStr] = React.useState(String(boothGap));

  React.useEffect(() => {
    if (!open) return;
    setSizeStr(String(boothSize));
    setGapStr(String(boothGap));
  }, [open, boothSize, boothGap]);

  const sizeN = toIntOrFallback(sizeStr, boothSize, 20, 400);
  const gapN = toIntOrFallback(gapStr, boothGap, 0, 200);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações do mapa</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="planta" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="planta">Planta</TabsTrigger>
            <TabsTrigger value="edicao">Edição</TabsTrigger>
            <TabsTrigger value="barracas">Barracas</TabsTrigger>
          </TabsList>

          <TabsContent value="planta" className="space-y-4 pt-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onPickBlueprintFile(file);
                e.currentTarget.value = "";
              }}
            />

            <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
              A planta é uma imagem de referência para desenhar por cima.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                {hasBlueprint ? "Alterar planta" : "Carregar planta"}
              </Button>

              {hasBlueprint ? (
                <Button variant="outline" onClick={onToggleBlueprint}>
                  {isBlueprintVisible ? "Esconder planta" : "Mostrar planta"}
                </Button>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="edicao" className="space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="text-sm font-medium">Modo de edição</div>
                <div className="text-xs text-muted-foreground">
                  Quando desativado, as laterais recolhem e o clique vira operacional (vínculo de slots).
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">OFF</Label>
                <Switch checked={isEditMode} onCheckedChange={onToggleEditMode} />
                <Label className="text-xs text-muted-foreground">ON</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="barracas" className="space-y-4 pt-4">
            <div className="rounded-xl border p-3">
              <div className="text-sm font-medium">Padrão de barraca</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Usado ao criar barracas, colar (Ctrl+V) e gerar em área.
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tamanho (px)</Label>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={sizeStr}
                    onChange={(e) => setSizeStr(digitsOnly(e.target.value))}
                    onBlur={() => {
                      const next = sizeN;
                      setSizeStr(String(next));
                      onChangeBoothConfig({ boothSize: next, gap: gapN });
                    }}
                    placeholder="ex: 70"
                  />
                  <p className="text-[11px] text-muted-foreground">20 a 400</p>
                </div>

                <div className="space-y-2">
                  <Label>Gap (px)</Label>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={gapStr}
                    onChange={(e) => setGapStr(digitsOnly(e.target.value))}
                    onBlur={() => {
                      const next = gapN;
                      setGapStr(String(next));
                      onChangeBoothConfig({ boothSize: sizeN, gap: next });
                    }}
                    placeholder="ex: 8"
                  />
                  <p className="text-[11px] text-muted-foreground">0 a 200</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                Atual: <span className="font-medium text-foreground">{sizeN}px</span> • gap{" "}
                <span className="font-medium text-foreground">{gapN}px</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}