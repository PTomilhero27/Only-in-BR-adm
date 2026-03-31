"use client";

/**
 * Legenda do mapa — atualizada com status do Marketplace.
 */

export function LegendPanel() {
  return (
    <div className="rounded-xl border p-4">
      <h2 className="text-sm font-medium">Legenda</h2>

      <div className="mt-3 space-y-2 text-sm">
        <Item color="bg-yellow-200" strokeColor="border-yellow-600" label="Disponível" />
        <Item color="bg-blue-100" strokeColor="border-blue-600" label="Reservado" />
        <Item color="bg-green-200" strokeColor="border-green-600" label="Confirmado" />
        <Item color="bg-red-100" strokeColor="border-red-600" label="Bloqueado" />
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
}: {
  color: string;
  strokeColor: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3.5 w-3.5 rounded border ${color} ${strokeColor}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
