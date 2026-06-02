"use client";

/**
 * Dialog de Importação de Planilha de Estoque.
 *
 * Responsabilidade:
 * - Coletar parâmetros de configuração da planilha (aba, linha de cabeçalho, linha de início).
 * - Exibir prévia da importação (linhas válidas, novos itens, atualizados, erros).
 * - Mostrar tabelas com destaque visual por ação (CREATE/UPDATE) e status de erros/avisos.
 * - Confirmar importação e disparar invalidação de listagem de estoque.
 */

import { useState, useMemo } from "react";
import { 
  FileSpreadsheet, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Info,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";

import {
  useInventoryImportPreviewMutation,
  useConfirmInventoryImportMutation,
} from "../inventory.queries";
import type { InventoryImportPreviewResponse, InventoryImportRow } from "../types";

export function InventoryImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [sheetName, setSheetName] = useState("INVENTARIO MAIO");
  const [headerRow, setHeaderRow] = useState("1");
  const [dataStartRow, setDataStartRow] = useState("2");
  
  // Local table search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "CREATE" | "UPDATE" | "INVALID">("ALL");

  const previewMutation = useInventoryImportPreviewMutation();
  const confirmMutation = useConfirmInventoryImportMutation();

  const previewData: InventoryImportPreviewResponse | undefined = previewMutation.data;

  // Handle generating preview
  async function handleGeneratePreview() {
    const header = Number(headerRow);
    const start = Number(dataStartRow);

    if (!sheetName.trim()) {
      toast.warning({ title: "Informe o nome da aba." });
      return;
    }
    if (Number.isNaN(header) || header <= 0) {
      toast.warning({ title: "Linha do cabeçalho inválida." });
      return;
    }
    if (Number.isNaN(start) || start <= 0) {
      toast.warning({ title: "Linha de início dos dados inválida." });
      return;
    }

    try {
      await previewMutation.mutateAsync({
        sheetName: sheetName.trim(),
        headerRow: header,
        dataStartRow: start,
      });
      setStep(2);
      setSearchQuery("");
      setActionFilter("ALL");
      toast.success({
        title: "Prévia gerada com sucesso",
        subtitle: "Revise a lista abaixo antes de confirmar a importação.",
      });
    } catch (error) {
      toast.error({
        title: "Erro ao carregar planilha",
        subtitle: getErrorMessage(error),
      });
    }
  }

  // Handle confirming import
  async function handleConfirmImport() {
    const header = Number(headerRow);
    const start = Number(dataStartRow);

    try {
      const response = await confirmMutation.mutateAsync({
        sheetName: sheetName.trim(),
        headerRow: header,
        dataStartRow: start,
      });

      toast.success({
        title: "Importação Concluída",
        subtitle: `${response.createdCount} novos itens criados e ${response.updatedCount} itens atualizados.`,
      });
      onOpenChange(false);
      resetState();
    } catch (error) {
      toast.error({
        title: "Erro ao confirmar importação",
        subtitle: getErrorMessage(error),
      });
    }
  }

  function resetState() {
    setStep(1);
    setSheetName("INVENTARIO MAIO");
    setHeaderRow("1");
    setDataStartRow("2");
    previewMutation.reset();
    confirmMutation.reset();
  }

  function handleClose(openState: boolean) {
    onOpenChange(openState);
    if (!openState) {
      resetState();
    }
  }

  // Filter preview rows locally
  const filteredRows = useMemo(() => {
    if (!previewData?.rows) return [];
    
    return previewData.rows.filter((row: InventoryImportRow) => {
      // Search match
      const nameMatch = row.item.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Action match
      if (actionFilter === "ALL") return nameMatch;
      if (actionFilter === "CREATE") return nameMatch && row.action === "CREATE" && row.status === "VALID";
      if (actionFilter === "UPDATE") return nameMatch && row.action === "UPDATE" && row.status === "VALID";
      if (actionFilter === "INVALID") return nameMatch && row.status === "INVALID";
      
      return nameMatch;
    });
  }, [previewData, searchQuery, actionFilter]);

  const summary = previewData?.summary;
  const hasErrors = summary && summary.errorCount > 0;
  const isImportDisabled = !previewData || hasErrors || confirmMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === 1 ? "sm:max-w-lg" : "sm:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
            <DialogTitle>Importar Estoque (Planilha)</DialogTitle>
          </div>
          <DialogDescription>
            {step === 1 
              ? "Configure a planilha integrada no back-end para ler a lista de produtos."
              : "Analise a prévia de alterações encontradas na planilha antes de consolidar."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          // STEP 1: CONFIGURATION FORM
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="sheetName">Nome da Aba (Tab Name)</Label>
              <Input
                id="sheetName"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Ex: INVENTARIO MAIO"
              />
              <p className="text-xs text-muted-foreground">
                O nome exato da aba na planilha Google Sheets que contém os dados.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="headerRow">Linha do Cabeçalho</Label>
                <Input
                  id="headerRow"
                  type="number"
                  min={1}
                  value={headerRow}
                  onChange={(e) => setHeaderRow(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataStartRow">Linha de Início dos Dados</Label>
                <Input
                  id="dataStartRow"
                  type="number"
                  min={1}
                  value={dataStartRow}
                  onChange={(e) => setDataStartRow(e.target.value)}
                  placeholder="2"
                />
              </div>
            </div>

            <Alert className="surface-soft border border-border mt-2">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs text-muted-foreground">
                A planilha precisa estar configurada nas variáveis de ambiente do back-end. A prévia não fará alterações persistentes no banco de dados.
              </AlertDescription>
            </Alert>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGeneratePreview} disabled={previewMutation.isPending}>
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Gerar Prévia
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // STEP 2: PREVIEW & REVIEW PANEL
          <div className="flex flex-col gap-4 overflow-hidden py-2 flex-1 min-h-0">
            {/* KPI Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <span className="block text-xs font-medium text-muted-foreground">Total de Linhas</span>
                  <span className="text-xl font-semibold text-primary">{summary.totalRows}</span>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/20 p-3 text-center">
                  <span className="block text-xs font-medium text-emerald-800">Prontos p/ Importar</span>
                  <span className="text-xl font-semibold text-emerald-700">{summary.validCount}</span>
                </div>
                <div className="rounded-lg border border-teal-100 bg-teal-50/20 p-3 text-center">
                  <span className="block text-xs font-medium text-teal-800">Novos (CREATE)</span>
                  <span className="text-xl font-semibold text-teal-600">{summary.newCount}</span>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/20 p-3 text-center">
                  <span className="block text-xs font-medium text-blue-800">Atualizar (UPDATE)</span>
                  <span className="text-xl font-semibold text-blue-600">{summary.updateCount}</span>
                </div>
                <div className={`rounded-lg border p-3 text-center ${hasErrors ? 'border-rose-200 bg-rose-50/30' : 'bg-muted/30 border-border'}`}>
                  <span className={`block text-xs font-medium ${hasErrors ? 'text-rose-800' : 'text-muted-foreground'}`}>Com Erros</span>
                  <span className={`text-xl font-semibold ${hasErrors ? 'text-rose-600' : 'text-primary'}`}>{summary.errorCount}</span>
                </div>
              </div>
            )}

            {/* Validation Banner Alerts */}
            {hasErrors ? (
              <Alert variant="destructive" className="bg-rose-50/50 border border-rose-100">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-semibold text-rose-800">Planilha contém erros de validação</AlertTitle>
                <AlertDescription className="text-rose-700">
                  Há {summary?.errorCount} linhas inválidas. Corrija-as na planilha ou certifique-se de que os dados atendem aos requisitos antes de prosseguir. O botão de importação está desabilitado para evitar corrupção de dados.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-emerald-100 bg-emerald-50/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="font-semibold text-emerald-800">Tudo pronto para a importação!</AlertTitle>
                <AlertDescription className="text-emerald-700">
                  Todas as {summary?.totalRows} linhas estão estruturadas perfeitamente. Clique em "Confirmar Importação" para efetivar no banco de dados.
                </AlertDescription>
              </Alert>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar produto na prévia..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={actionFilter === "ALL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionFilter("ALL")}
                >
                  Todos ({previewData?.rows.length})
                </Button>
                <Button
                  variant={actionFilter === "CREATE" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionFilter("CREATE")}
                  className={actionFilter !== "CREATE" ? "text-teal-700 hover:text-teal-800" : ""}
                >
                  Novos ({summary?.newCount})
                </Button>
                <Button
                  variant={actionFilter === "UPDATE" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionFilter("UPDATE")}
                  className={actionFilter !== "UPDATE" ? "text-blue-700 hover:text-blue-800" : ""}
                >
                  Atualizar ({summary?.updateCount})
                </Button>
                <Button
                  variant={actionFilter === "INVALID" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionFilter("INVALID")}
                  className={actionFilter !== "INVALID" ? "text-rose-700 hover:text-rose-800" : ""}
                >
                  Erros ({summary?.errorCount})
                </Button>
              </div>
            </div>

            {/* Preview Table in Scroll Area */}
            <div className="flex-1 min-h-[150px] overflow-hidden rounded-md border border-border bg-white flex flex-col">
              <ScrollArea className="flex-1 w-full">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-16 text-center">Linha</TableHead>
                      <TableHead className="w-24">Ação</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="min-w-[200px]">Nome do Produto</TableHead>
                      <TableHead className="w-20 text-center">Qtd</TableHead>
                      <TableHead className="min-w-[250px]">Mensagens / Diferenças</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          Nenhum produto atende aos filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row: InventoryImportRow, index: number) => {
                        const isCreate = row.action === "CREATE";
                        const isValid = row.status === "VALID";
                        
                        let actionBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                        if (isCreate) {
                          actionBadgeClass = "bg-teal-50 text-teal-700 border-teal-200";
                        }
                        
                        return (
                          <TableRow 
                            key={`${row.rowNumber}-${index}`} 
                            className={
                              !isValid 
                                ? "bg-rose-50/20 hover:bg-rose-50/30" 
                                : isCreate 
                                  ? "bg-teal-50/5 hover:bg-teal-50/10" 
                                  : "bg-blue-50/5 hover:bg-blue-50/10"
                            }
                          >
                            <TableCell className="text-center font-mono font-medium text-muted-foreground">
                              {row.rowNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={actionBadgeClass}>
                                {row.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isValid ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  VÁLIDO
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  INVÁLIDO
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-primary">
                              {row.item.name}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {row.item.quantity}
                            </TableCell>
                            <TableCell className="text-xs">
                              {/* Display errors */}
                              {row.errors && row.errors.length > 0 && (
                                <div className="space-y-1 text-destructive font-medium">
                                  {row.errors.map((err, i) => (
                                    <div key={i} className="flex items-start gap-1">
                                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Display warnings */}
                              {row.warnings && row.warnings.length > 0 && (
                                <div className="space-y-1 text-amber-600 font-medium">
                                  {row.warnings.map((warn, i) => (
                                    <div key={i} className="flex items-start gap-1">
                                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                      <span>{warn}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Display existing item diff if UPDATE */}
                              {!isCreate && row.item.existingItem && (
                                <div className="text-muted-foreground mt-1 bg-muted/40 p-1.5 rounded space-y-0.5">
                                  <div className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground/75">Dados atuais no banco:</div>
                                  <div>Qtd atual: <span className="font-semibold text-primary">{row.item.existingItem.currentQty}</span> &rarr; Nova: <span className="font-semibold text-primary">{row.item.quantity}</span></div>
                                  {row.item.notes && row.item.notes !== row.item.existingItem.notes && (
                                    <div className="line-clamp-2">Obs: <span className="font-medium text-primary">{row.item.notes}</span></div>
                                  )}
                                </div>
                              )}

                              {isCreate && !row.errors.length && (
                                <span className="text-muted-foreground">Será cadastrado como novo item de estoque.</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Step 2 Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4 gap-2">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={confirmMutation.isPending}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar à Configuração
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)} disabled={confirmMutation.isPending}>
                  Fechar
                </Button>
                <Button 
                  onClick={handleConfirmImport} 
                  disabled={isImportDisabled}
                  className="bg-brand-green hover:bg-brand-green/90 text-white font-medium"
                >
                  {confirmMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Processando Importação...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Confirmar Importação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
