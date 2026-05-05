"use client";

import { useMemo, useState } from "react";
import { DatabaseZap, FileSpreadsheet, RefreshCw, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast/use-toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import {
  useConfirmFairSuppliersImportMutation,
  usePreviewFairSuppliersImportMutation,
} from "../fair-suppliers.queries";
import { ImportSuppliersPreviewTable } from "./import-suppliers-preview-table";
import { SupplierPaymentSummaryCard } from "./supplier-payment-summary-card";

import { useFairSupplierImportConfigQuery, useUpdateFairSupplierImportConfigMutation } from "../fair-suppliers.queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImportFairSuppliersDialog({ fairId }: { fairId: string }) {
  const [open, setOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const previewMutation = usePreviewFairSuppliersImportMutation(fairId);
  const confirmMutation = useConfirmFairSuppliersImportMutation(fairId);
  const configQuery = useFairSupplierImportConfigQuery(fairId);
  const updateConfigMutation = useUpdateFairSupplierImportConfigMutation(fairId);

  const [spreadsheetId, setSpreadsheetId] = useState("14kWbLoAvm0z1ixkcmsYoyhRnv1okQyWXm1ij7Opu-W4");
  const [sheetName, setSheetName] = useState("Página1");
  const [headerRow, setHeaderRow] = useState(2);
  const [dataStartRow, setDataStartRow] = useState(3);

  const preview = previewMutation.data;
  const hasCriticalErrors = useMemo(() => {
    return (preview?.summary.errorCount ?? 0) > 0 || preview?.rows.some((row) => row.status === "INVALID");
  }, [preview]);

  // Load initial config if available
  useMemo(() => {
    if (configQuery.data) {
      setSpreadsheetId(configQuery.data.spreadsheetId || "14kWbLoAvm0z1ixkcmsYoyhRnv1okQyWXm1ij7Opu-W4");
      setSheetName(configQuery.data.sheetName || "Página1");
      setHeaderRow(configQuery.data.headerRow || 2);
      setDataStartRow(configQuery.data.dataStartRow || 3);
    }
  }, [configQuery.data]);

  async function handleSaveConfig() {
    try {
      await updateConfigMutation.mutateAsync({
        spreadsheetId,
        sheetName,
        headerRow,
        dataStartRow,
      });
      toast({
        variant: "success",
        title: "Configuração salva",
        description: "As configurações da planilha foram atualizadas.",
      });
      setIsConfigOpen(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Erro ao salvar",
        description: getErrorMessage(err),
      });
    }
  }

  async function handlePreview() {
    try {
      await previewMutation.mutateAsync();
    } catch (err) {
      toast({
        variant: "error",
        title: "Nao foi possivel buscar a planilha",
        description: getErrorMessage(err),
      });
    }
  }

  async function handleConfirm() {
    try {
      await confirmMutation.mutateAsync({ importValidRowsOnly: true });
      toast({
        variant: "success",
        title: "Fornecedores importados",
        description: "A lista foi atualizada com os dados validos da planilha online.",
      });
      setOpen(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Nao foi possivel confirmar a importacao",
        description: getErrorMessage(err),
      });
    }
  }

  if (isConfigOpen) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configurar planilha</DialogTitle>
            <DialogDescription>
              Ajuste as informações da planilha Google Sheets usada na importação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Spreadsheet ID</Label>
              <Input
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="Ex: 14kWbLoAvm0z1ixkcmsYoyhRnv1okQyWXm1ij7Opu-W4"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da aba</Label>
              <Input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Ex: Página1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Linha do cabeçalho</Label>
                <Input
                  type="number"
                  value={headerRow}
                  onChange={(e) => setHeaderRow(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Linha inicial dos dados</Label>
                <Input
                  type="number"
                  value={dataStartRow}
                  onChange={(e) => setDataStartRow(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)} disabled={updateConfigMutation.isPending}>
              Voltar
            </Button>
            <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending || !spreadsheetId || !sheetName}>
              {updateConfigMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 rounded-lg">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Importar dados
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[1180px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle>Importar fornecedores da planilha online</DialogTitle>
              <DialogDescription>
                Esta importação busca os dados da aba configurada no Google Sheets. Nao e necessario enviar arquivo Excel manualmente nesta tela.
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(true)}>
              Configurar planilha
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto pr-1">
          <Alert className="border-blue-100 bg-blue-50 text-blue-900 shrink-0">
            <DatabaseZap className="h-4 w-4" />
            <AlertTitle>Fonte auxiliar de cadastro em lote</AlertTitle>
            <AlertDescription className="text-blue-900/75">
              Configuração atual: Planilha ID `{spreadsheetId.slice(0, 10)}...`, Aba `{sheetName}`, Dados iniciando na linha {dataStartRow}.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="h-10 rounded-lg"
            >
              {previewMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {previewMutation.isPending ? "Lendo planilha e validando fornecedores..." : "Buscar dados da planilha"}
            </Button>
          </div>

          {preview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SupplierPaymentSummaryCard
                  icon={FileSpreadsheet}
                  label="Total de linhas"
                  value={String(preview.summary.totalRows)}
                />
                <SupplierPaymentSummaryCard
                  icon={UploadCloud}
                  label="Novos"
                  value={String(preview.summary.newCount)}
                  tone="success"
                />
                <SupplierPaymentSummaryCard
                  icon={RefreshCw}
                  label="Atualizacoes"
                  value={String(preview.summary.updateCount)}
                />
                <SupplierPaymentSummaryCard
                  icon={DatabaseZap}
                  label="Linhas com erro"
                  value={String(preview.summary.errorCount)}
                  tone={preview.summary.errorCount > 0 ? "danger" : "success"}
                />
              </div>

              {hasCriticalErrors ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTitle>Existem linhas com erro</AlertTitle>
                  <AlertDescription className="text-amber-900/75">
                    Apenas linhas válidas serão importadas. A validação final continua sendo feita no backend.
                  </AlertDescription>
                </Alert>
              ) : null}

              <ImportSuppliersPreviewTable rows={preview.rows} />
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={confirmMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!preview || confirmMutation.isPending || (preview.summary.totalRows - preview.summary.errorCount <= 0)}
          >
            {confirmMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar importacao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
