import { ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FairSupplier, validateSupplierForPixRemittance } from "../../fair-suppliers/fair-suppliers.schema";
import { useRemittanceBuilder } from "../hooks/use-remittance-builder";
import { RemittanceSupplierCard } from "./remittance-supplier-card";
import { RemittanceSplitConfig } from "./remittance-split-config";
import { RemittanceSummaryCard } from "./remittance-summary-card";
import { useCreatePixRemittanceMutation, useRedoPixRemittanceMutation } from "../pix-remittances.queries";
import { downloadPixRemittance } from "../pix-remittances.service";
import { downloadBlob } from "@/app/shared/utils/download-blob";
import { toast } from "@/components/ui/toast/use-toast";
import { Banknote, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { PixRemittanceMode } from "../types";

/**
 * Este dialog centraliza o fluxo de montagem da remessa PIX a partir dos fornecedores da feira.
 */
interface CreatePixRemittanceDialogProps {
  fairId: string;
  suppliers: FairSupplier[];
  redoRemittanceId?: string;
  initialMode?: PixRemittanceMode;
  trigger?: ReactNode;
}

export function CreatePixRemittanceDialog({
  fairId,
  suppliers,
  redoRemittanceId,
  initialMode = "SINGLE",
  trigger,
}: CreatePixRemittanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const createMutation = useCreatePixRemittanceMutation();
  const redoMutation = useRedoPixRemittanceMutation();
  const isRedo = Boolean(redoRemittanceId);
  const builder = useRemittanceBuilder(fairId, suppliers, { includeInRemittance: isRedo });

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (val) {
      builder.setMode(initialMode);
      // Quando abrir, pré-seleciona todos os elegíveis
      const eligible = suppliers.filter(
        (s) => validateSupplierForPixRemittance(s, { includeInRemittance: isRedo }).length === 0,
      );
      if (eligible.length > 0) {
        // Usa setTimeout para garantir que o estado do hook foi inicializado
        setTimeout(() => builder.selectAll(eligible), 0);
      }
    } else {
      // Resetar estado ao fechar
      setTimeout(() => {
        builder.clearSelection();
        builder.setMode(initialMode);
        setIsConfirming(false);
      }, 300);
    }
  };

  const handleGenerate = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    const payload = builder.getPayload();

    try {
      setIsGenerating(true);
      // 1. Chamar a API para criar ou refazer a(s) remessa(s)
      const response = isRedo
        ? await redoMutation.mutateAsync({ ...payload, remittanceId: redoRemittanceId! })
        : await createMutation.mutateAsync(payload);

      // 2. Para cada remessa criada, tentar baixar o arquivo
      let downloadFailed = false;
      for (const remittance of response.createdRemittances) {
        try {
          const blob = await downloadPixRemittance(payload.fairId, remittance.id);
          downloadBlob(blob, remittance.fileName);
        } catch (downloadErr) {
          console.error(`Falha ao baixar remessa ${remittance.id}:`, downloadErr);
          downloadFailed = true;
        }
      }

      // 3. Toast de resultado
      if (downloadFailed) {
        toast({
          variant: "warning",
          title: isRedo ? "Remessa refeita com aviso" : "Remessa gerada com aviso",
          description:
            "A remessa foi gerada, mas não foi possível baixar automaticamente. Use o histórico de remessas para baixar o arquivo.",
        });
      } else {
        toast({
          variant: "success",
          title: isRedo ? "Remessa refeita e download iniciado!" : "Remessa gerada e download iniciado!",
          description: `${response.createdRemittances.length} arquivo(s) baixado(s) com sucesso.`,
        });
      }

      // 4. Fechar modal e limpar estado
      handleOpenChange(false);
    } catch (err) {
      console.error(isRedo ? "Erro ao refazer remessa:" : "Erro ao gerar remessa:", err);
      toast({
        variant: "error",
        title: isRedo ? "Erro ao refazer remessa" : "Erro ao gerar remessa",
        description: isRedo
          ? "Nao foi possivel refazer a remessa. Tente novamente."
          : "Nao foi possivel criar a remessa. Tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  // Fornecedores elegíveis: aqueles que passam na validação sem erros graves 
  // (neste caso, mostramos todos mas os bloqueados ficam desabilitados, então a contagem de elegíveis ajuda o selectAll)
  const eligibleSuppliers = suppliers.filter(
    (s) => validateSupplierForPixRemittance(s, { includeInRemittance: isRedo }).length === 0,
  );
  const isAllEligibleSelected = eligibleSuppliers.length > 0 && eligibleSuppliers.every(s => builder.selectedIds.has(s.id));

  const handleSelectAllToggle = () => {
    if (isAllEligibleSelected) {
      builder.clearSelection();
    } else {
      builder.selectAll(eligibleSuppliers);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-10 rounded-lg gap-2">
            <Banknote className="h-4 w-4" />
            Gerar remessa
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="h-[90vh] w-[95vw] max-w-[95vw] sm:max-w-5xl overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-xl">{isRedo ? "Refazer remessa PIX" : "Gerar remessa PIX"}</DialogTitle>
            <DialogDescription>
              {isRedo
                ? "A remessa antiga sera cancelada e uma nova remessa sera criada com os itens selecionados."
                : "Selecione os fornecedores que deseja incluir na remessa e escolha se deseja gerar um ou dois documentos."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50 min-h-0">
          {/* Lado Esquerdo: Lista */}
          <div className="flex-1 flex flex-col border-r border-border overflow-hidden min-h-0">
            <div className="p-4 border-b border-border flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all" 
                  checked={isAllEligibleSelected}
                  onCheckedChange={handleSelectAllToggle}
                  disabled={eligibleSuppliers.length === 0}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer text-slate-700">
                  Selecionar todos elegíveis ({eligibleSuppliers.length})
                </label>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={builder.clearSelection}
                disabled={builder.selectedIds.size === 0}
                className="text-xs h-8 text-slate-500"
              >
                Limpar seleção
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3">
                {suppliers.length === 0 ? (
                  <div className="text-center p-8 text-sm text-slate-500">
                    Nenhum fornecedor disponível para esta feira.
                  </div>
                ) : (
                  suppliers.map((supplier) => (
                    <RemittanceSupplierCard
                      key={supplier.id}
                      supplier={supplier}
                      isSelected={builder.selectedIds.has(supplier.id)}
                      onToggle={() => builder.toggleSelection(supplier)}
                      amountCents={builder.amountsCents[supplier.id] || 0}
                      onChangeAmount={(val) => builder.setSupplierAmount(supplier.id, val)}
                      includeInRemittance={isRedo}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Resumo e Configuração */}
          <div className="w-full lg:w-[380px] flex flex-col bg-white overflow-y-auto min-h-0">
            <div className="p-6 flex flex-col gap-6">
              <RemittanceSplitConfig 
                mode={builder.mode}
                onChangeMode={builder.setMode}
                disabled={builder.selectedIds.size === 0}
              />
              <RemittanceSummaryCard summary={builder.summary} />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-white mt-auto">
          {isConfirming ? (
            <div className="flex flex-col gap-3">
              <div className="bg-amber-50 text-amber-900 text-sm p-3 rounded-lg border border-amber-200">
                <strong>Confirmação:</strong> Você está prestes a {isRedo ? "refazer" : "gerar"} {builder.summary.remittancesCount} remessa(s) PIX 
                para {builder.summary.selectedCount} fornecedor(es), no valor total de {builder.summary.totalRemittanceCents / 100 > 0 ? (builder.summary.totalRemittanceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}.
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setIsConfirming(false)} disabled={isGenerating}>
                  Voltar
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isGenerating ? (isRedo ? "Refazendo..." : "Gerando...") : (isRedo ? "Confirmar refazer" : "Confirmar geração")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={builder.selectedIds.size === 0}
              >
                {isRedo ? "Refazer remessa" : "Gerar remessa"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
