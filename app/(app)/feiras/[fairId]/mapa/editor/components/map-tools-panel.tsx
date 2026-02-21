"use client";

/**
 * MapToolsPanel (estilo Figma)
 * - Troca ferramenta ativa
 * - Ajuste visual: quando ativo, o hotkey vira "verde claro + preto bold"
 */

import { Button } from "@/components/ui/button";
import type { MapTool } from "../../types/types";

type Props = {
  tool: MapTool;
  onChangeTool: (tool: MapTool) => void;
  isEditMode: boolean;
};

const tools: { key: MapTool; label: string; hotkey: string }[] = [
  { key: "SELECT", label: "Selecionar", hotkey: "1" },
  { key: "BOOTH", label: "Barraca (Nº)", hotkey: "2" },
  { key: "RECT", label: "Retângulo", hotkey: "3" },
  { key: "SQUARE", label: "Quadrado", hotkey: "4" },
  { key: "LINE", label: "Linha", hotkey: "5" },
  { key: "TEXT", label: "Texto", hotkey: "6" },
  { key: "TREE", label: "Árvore", hotkey: "7" },
];

export function MapToolsPanel({ tool, onChangeTool, isEditMode }: Props) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Ferramentas
      </div>

      <div className="grid gap-2">
        {tools.map((t) => {
          const active = tool === t.key;

          return (
            <Button
              key={t.key}
              variant={active ? "default" : "outline"}
              className="justify-start"
              disabled={!isEditMode}
              onClick={() => onChangeTool(t.key)}
              title={!isEditMode ? "Ative o modo edição" : undefined}
            >
              <span
                className={[
                  "mr-2 inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold",
                  active
                    ? "bg-emerald-200 text-black"
                    : "bg-muted text-foreground",
                ].join(" ")}
              >
                {t.hotkey}
              </span>

              <span className={active ? "font-bold" : "font-medium"}>
                {t.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}