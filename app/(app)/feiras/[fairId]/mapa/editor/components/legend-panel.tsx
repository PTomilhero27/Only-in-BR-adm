"use client";

// src/modules/fair-map-2d/components/legend-panel.tsx
/**
 * Legenda do mapa (ajuda muito na montagem e leitura rápida).
 */

export function LegendPanel() {
  return (
    <div className="rounded-xl border p-4">
      <h2 className="text-sm font-medium">Legenda</h2>

      <div className="mt-3 space-y-2 text-sm">
        <Item color="bg-slate-300" label="Livre" />
        <Item color="bg-green-500" label="Vinculada" />
        <Item color="bg-red-500" label="Bloqueada" />
        <Item color="bg-yellow-500" label="Atenção" />
      </div>
    </div>
  );
}

function Item({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
