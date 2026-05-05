import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FairSupplier,
  formatDocument,
  formatMoneyBRLFromCents,
  getSupplierRemittanceAvailableCents,
  validateSupplierForPixRemittance,
} from "../../fair-suppliers/fair-suppliers.schema";
import { AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Este componente representa um fornecedor elegível para a montagem da remessa,
 * permitindo seleção e visualização rápida dos dados financeiros e do PIX.
 */
interface RemittanceSupplierCardProps {
  supplier: FairSupplier;
  isSelected: boolean;
  onToggle: () => void;
  amountCents: number;
  onChangeAmount: (cents: number) => void;
  includeInRemittance?: boolean;
}

export function RemittanceSupplierCard({
  supplier,
  isSelected,
  onToggle,
  amountCents,
  onChangeAmount,
  includeInRemittance = false,
}: RemittanceSupplierCardProps) {
  // Verificamos se o fornecedor pode ser selecionado
  const warnings = validateSupplierForPixRemittance(supplier, { includeInRemittance });
  const isDisabled = warnings.length > 0;
  
  const pendingCents = getSupplierRemittanceAvailableCents(supplier, { includeInRemittance });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value.replace(",", "."));
    if (isNaN(val)) val = 0;
    
    // Limitar entre 0 e o valor pendente
    let newCents = Math.round(val * 100);
    if (newCents < 0) newCents = 0;
    if (newCents > pendingCents) newCents = pendingCents;
    
    onChangeAmount(newCents);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-white",
        isDisabled && "opacity-75 bg-slate-50"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <Checkbox
            checked={isSelected}
            disabled={isDisabled}
            onCheckedChange={onToggle}
            className="h-5 w-5 rounded-md"
          />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900 line-clamp-1 cursor-pointer" onClick={() => !isDisabled && onToggle()}>{supplier.name}</div>
            <div className="text-xs text-slate-500">{formatDocument(supplier.document)}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {supplier.pixKeyType && supplier.pixKey ? (
              <Badge variant="outline" className="bg-slate-50 font-normal">
                {supplier.pixKeyType}: <span className="ml-1 font-medium">{supplier.pixKey}</span>
              </Badge>
            ) : (
              <Badge variant="destructive" className="font-normal">
                PIX Ausente
              </Badge>
            )}
            
            {supplier.installments.length > 0 && (
              <span className="flex items-center text-slate-500">
                <FileText className="mr-1 h-3 w-3" />
                {supplier.installments.length} parcela{supplier.installments.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {isDisabled && (
        <div className="flex items-center gap-2 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700 mt-1">
          <AlertCircle className="h-4 w-4" />
          <span>Motivos de bloqueio: {warnings.join(", ")}</span>
        </div>
      )}

      {/* Editor de valor da remessa */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4 rounded-md bg-slate-50 p-3">
        <div className="space-y-0.5">
          <div className="text-xs text-slate-500">Saldo Pendente</div>
          <div className="text-sm font-semibold text-slate-900">
            {formatMoneyBRLFromCents(pendingCents)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <label className="text-xs text-slate-500">Valor para a remessa</label>
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={pendingCents / 100}
              disabled={!isSelected}
              value={amountCents / 100}
              onChange={handleAmountChange}
              className="h-9 pl-8 text-right font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
