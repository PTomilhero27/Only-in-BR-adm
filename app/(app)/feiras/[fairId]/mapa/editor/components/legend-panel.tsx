"use client";

/**
 * Legenda do mapa — atualizada com status do Marketplace.
 */

type LegendCounts = {
  AVAILABLE: number;
  RESERVED: number;
  CONFIRMED: number;
  BLOCKED: number;
};

export function LegendPanel({ counts }: { counts?: LegendCounts }) {
  return (
    <div className="rounded-xl border p-4">
      <h2 className="text-sm font-medium">Legenda</h2>

      <div className="mt-3 space-y-2 text-sm">
        <Item
          color="bg-yellow-200"
          strokeColor="border-yellow-600"
          label="livres"
          count={counts?.AVAILABLE}
        />
        <Item
          color="bg-blue-100"
          strokeColor="border-blue-600"
          label="Reservado"
          count={counts?.RESERVED}
        />
        <Item
          color="bg-green-200"
          strokeColor="border-green-600"
          label="barraca vinculadas"
          count={counts?.CONFIRMED}
        />
        <Item
          color="bg-red-100"
          strokeColor="border-red-600"
          label="bloqueado"
          count={counts?.BLOCKED}
        />
      </div>

      <div className="mt-3 border-t pt-2 space-y-2 text-sm">
        <Item color="bg-slate-200" strokeColor="border-slate-500" label="Sem slot comercial" />
      </div>
    </div>
  );
}

function Item({
  color,
  strokeColor,
  label,
  count,
}: {
  color: string;
  strokeColor: string;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className={`h-3.5 w-3.5 rounded border ${color} ${strokeColor}`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      {typeof count === "number" && (
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
      )}
    </div>
  );
}
