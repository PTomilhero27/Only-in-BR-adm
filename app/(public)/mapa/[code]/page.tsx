"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { MapPinned } from "lucide-react";
import { useValidateMagicLinkMutation } from "@/app/modules/fair-maps/magic-link.queries";

import { FairMap2DCanvas } from "@/app/(app)/feiras/[fairId]/mapa/editor/components/fair-map-2d-canvas";
import type { MapElement } from "@/app/(app)/feiras/[fairId]/mapa/types/types";

function normalizeStyle(style: unknown) {
  const fallback = { fill: "#CBD5E1", stroke: "#0F172A", strokeWidth: 2, opacity: 0.65 }
  if (!style || typeof style !== "object") return fallback
  const s = style as any
  return {
    fill: typeof s.fill === "string" ? s.fill : fallback.fill,
    stroke: typeof s.stroke === "string" ? s.stroke : fallback.stroke,
    strokeWidth: typeof s.strokeWidth === "number" ? s.strokeWidth : fallback.strokeWidth,
    opacity: typeof s.opacity === "number" ? s.opacity : fallback.opacity,
  }
}

function adaptTemplateElementToCanvasElement(el: any): MapElement {
  const style = normalizeStyle(el.style)
  const clientKey = el.clientKey ?? el.id
  const t = String(el.type ?? "RECT")

  if (t === "LINE") {
    return {
      id: clientKey,
      type: "LINE",
      x: 0,
      y: 0,
      rotation: el.rotation ?? 0,
      style,
      points: (el.points ?? []) as number[],
    } as any
  }

  if (t === "TEXT") {
    const text = el.text ?? el.label ?? "Texto"
    const fontSize = el.fontSize ?? el?.style?.fontSize ?? 18
    return {
      id: clientKey,
      type: "TEXT",
      x: el.x ?? 0,
      y: el.y ?? 0,
      rotation: el.rotation ?? 0,
      style,
      text,
      fontSize,
      boxed: el.boxed ?? el?.style?.boxed ?? true,
      padding: el.padding ?? el?.style?.padding ?? 10,
      borderRadius: el.borderRadius ?? el?.style?.borderRadius ?? 10,
    } as any
  }

  if (t === "TREE") {
    return {
      id: clientKey,
      type: "TREE",
      x: el.x ?? 0,
      y: el.y ?? 0,
      rotation: el.rotation ?? 0,
      style,
      radius: (el.radius ?? 14) as number,
      label: el.label ?? undefined,
    } as any
  }

  const rectKind = t === "BOOTH_SLOT" ? "BOOTH" : t === "SQUARE" ? "SQUARE" : "RECT"

  return {
    id: clientKey,
    type: "RECT",
    rectKind,
    x: el.x ?? 0,
    y: el.y ?? 0,
    rotation: el.rotation ?? 0,
    style,
    width: (el.width ?? 60) as number,
    height: (el.height ?? 60) as number,
    isLinkable: rectKind === "BOOTH",
    number: rectKind === "BOOTH" ? (el.number ?? undefined) : undefined,
    label: rectKind !== "BOOTH" ? (el.label ?? "") : undefined,
  } as any
}

export default function MagicLinkPage() {
  const params = useParams();
  const code = params.code as string;
  
  const [mapData, setMapData] = useState<any | null>(null);
  const [pin, setPin] = useState("");
  
  const validateMutation = useValidateMagicLinkMutation(code);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      toast.error({ title: "Aviso", subtitle: "Preencha o PIN." });
      return;
    }
    try {
      const response = await validateMutation.mutateAsync({ pin });
      setMapData(response.fairMap);
      toast.success({
        title: "Acesso Liberado",
        subtitle: "Você agora pode visualizar o mapa da feira.",
      });
    } catch (error: any) {
      toast.error({
        title: "Erro ao validar PIN",
        subtitle: error?.message || "O PIN inserido é inválido ou expirou.",
      });
    }
  }

  // Se o mapa foi carregado, exibe apenas a visualização (sem ferramentas)
  if (mapData) {
    const template = mapData.template;
    const rawElements = template?.elements || [];
    
    const canvasElements: MapElement[] = rawElements.map((el: any) => adaptTemplateElementToCanvasElement(el));
    
    const linkedIds: Set<string> = new Set(
      (mapData.links || []).map((l: any) => String(l.slotClientKey || ""))
    );
    
    return (
      <div className="flex h-screen w-screen flex-col bg-slate-50">
        <header className="flex h-14 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MapPinned className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold">{template?.title || "Mapa da Feira"}</h1>
          </div>
          <p className="text-sm text-muted-foreground">Modo Visualização (Somente Leitura)</p>
        </header>

        <main className="relative flex-1 overflow-hidden">
          <FairMap2DCanvas
            backgroundUrl={template?.backgroundUrl || undefined}
            elements={canvasElements}
            setElements={() => {}} // Não permite alterar
            isEditMode={false}      // Trava interação
            tool="SELECT"
            selectedIds={[]}
            onSelectIds={() => {}} // Não seleciona nada
            linkedBoothIds={linkedIds}
          />
        </main>
      </div>
    );
  }

  // Se não validou, exibe a tela de PIN
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPinned className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acesso ao Mapa</CardTitle>
          <CardDescription>
            Insira o PIN fornecido para acessar a planta da feira.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Código PIN
              </label>
              <Input
                id="pin"
                type="password"
                placeholder="••••••"
                maxLength={8}
                className="text-center text-lg tracking-widest"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? "Validando..." : "Acessar Mapa"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
