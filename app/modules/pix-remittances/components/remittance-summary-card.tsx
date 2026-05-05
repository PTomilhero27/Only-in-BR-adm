import { formatMoneyBRLFromCents } from "../../fair-suppliers/fair-suppliers.schema";

interface RemittanceSummaryCardProps {
  summary: {
    selectedCount: number;
    totalRemittanceCents: number;
    lote1Count: number;
    totalLote1Cents: number;
    lote2Count: number;
    totalLote2Cents: number;
    remittancesCount: number;
  };
}

export function RemittanceSummaryCard({ summary }: RemittanceSummaryCardProps) {
  if (summary.selectedCount === 0) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/50 p-6 text-center">
        <p className="text-sm font-medium text-slate-500">Nenhum fornecedor selecionado</p>
        <p className="mt-1 text-xs text-slate-400">
          Selecione fornecedores na lista ao lado para ver o resumo da remessa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm">
      <div>
        <h3 className="font-semibold text-slate-900">Resumo da Remessa</h3>
        <p className="text-xs text-slate-500">
          {summary.selectedCount} {summary.selectedCount === 1 ? "fornecedor" : "fornecedores"}
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Total geral</span>
          <span className="font-bold text-slate-900">
            {formatMoneyBRLFromCents(summary.totalRemittanceCents)}
          </span>
        </div>

        <div className="h-px w-full bg-border" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Documentos a gerar</span>
          <span className="font-medium text-slate-900">{summary.remittancesCount}</span>
        </div>

        {summary.remittancesCount === 1 && (
          <div className="flex items-center justify-between rounded bg-slate-50 p-2">
            <span className="text-xs text-slate-600">Lote Único ({summary.lote1Count})</span>
            <span className="text-xs font-semibold text-slate-900">
              {formatMoneyBRLFromCents(summary.totalLote1Cents)}
            </span>
          </div>
        )}

        {summary.remittancesCount === 2 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded bg-slate-50 p-2">
              <span className="text-xs text-slate-600">Lote 1 ({summary.lote1Count})</span>
              <span className="text-xs font-semibold text-slate-900">
                {formatMoneyBRLFromCents(summary.totalLote1Cents)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 p-2">
              <span className="text-xs text-slate-600">Lote 2 ({summary.lote2Count})</span>
              <span className="text-xs font-semibold text-slate-900">
                {formatMoneyBRLFromCents(summary.totalLote2Cents)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
