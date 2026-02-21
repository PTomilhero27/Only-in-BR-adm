"use client";

/**
 * MapHeader
 *
 * Header “clean/tech” do Editor do Mapa:
 * - Mostra título, nome do mapa/template e estado (EDITANDO / VISUALIZAÇÃO)
 * - Ações principais: Configurações e Salvar
 *
 * Decisão:
 * - Header não sabe “regras de planta”, isso fica no dialog de configurações.
 */

import { Button } from "@/components/ui/button";

type Props = {
  mapName: string;
  isEditMode: boolean;

  onOpenSettings: () => void;
  onSave: () => void;

  /**
   * ✅ Estado de carregamento do salvamento
   * (evita múltiplos PUT em sequência)
   */
  isSaving?: boolean;
};

export function MapHeader({
  mapName,
  isEditMode,
  onOpenSettings,
  onSave,
  isSaving,
}: Props) {
  return (
    <div className="rounded-2xl border bg-background/70 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Editor do mapa</h1>

            <span className="text-sm text-muted-foreground">{mapName}</span>

            <span
              className={[
                "rounded-full px-2 py-0.5 text-xs font-medium",
                isEditMode ? "bg-orange-500 text-white" : "border bg-background text-muted-foreground",
              ].join(" ")}
            >
              {isEditMode ? "EDITANDO" : "VISUALIZAÇÃO"}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? "Modo edição: desenhe elementos por cima do blueprint e ajuste posições."
              : "Modo visualização: navegue e inspecione o mapa (sem edição)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onOpenSettings} disabled={!!isSaving}>
            Configurações
          </Button>

          <Button onClick={onSave} disabled={!isEditMode || !!isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}