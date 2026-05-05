import { PixRemittanceMode } from "../types";
import { cn } from "@/lib/utils";

/**
 * Este componente controla a forma de agrupamento dos fornecedores na geração da remessa,
 * permitindo gerar um único lote ou dividir em dois documentos.
 */
interface RemittanceSplitConfigProps {
  mode: PixRemittanceMode;
  onChangeMode: (mode: PixRemittanceMode) => void;
  disabled?: boolean;
}

export function RemittanceSplitConfig({ mode, onChangeMode, disabled }: RemittanceSplitConfigProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border p-5 bg-white shadow-sm">
      <div className="text-sm font-semibold text-slate-800">Modo de Geração</div>
      
      <div className="flex w-full items-center gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChangeMode("SINGLE")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-all",
            mode === "SINGLE" 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-600 hover:text-slate-900",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          Lote Único
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChangeMode("SPLIT_TWO")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-all",
            mode === "SPLIT_TWO" 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-600 hover:text-slate-900",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          Dividir em 2 Lotes
        </button>
      </div>

      {mode === "SPLIT_TWO" && (
        <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
          Os fornecedores selecionados serão divididos automaticamente em dois grupos mantendo a ordem da lista (metade para cada remessa).
        </div>
      )}
    </div>
  );
}
