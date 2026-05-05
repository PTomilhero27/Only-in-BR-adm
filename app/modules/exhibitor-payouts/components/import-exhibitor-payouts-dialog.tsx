"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, DatabaseZap, FileSpreadsheet, RefreshCw, UploadCloud } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast/use-toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { SupplierPaymentSummaryCard } from "../../fair-suppliers/components/supplier-payment-summary-card";
import {
  useConfirmExhibitorPayoutsImportMutation,
  useExhibitorPayoutImportConfigQuery,
  usePreviewExhibitorPayoutsImportMutation,
  useUpdateExhibitorPayoutImportConfigMutation,
} from "../exhibitor-payouts.queries";
import {
  DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG,
  getImportRowPayout,
  getPayoutName,
} from "../exhibitor-payouts.schema";
import { ImportExhibitorPayoutsPreviewTable } from "./import-exhibitor-payouts-preview-table";
import { ExhibitorPayoutPreviewRemittanceDialog } from "./exhibitor-payout-preview-remittance-dialog";

const SERVICE_ACCOUNT = "onlyinbr-sheets@onlyinbr-admin.iam.gserviceaccount.com";

function normalizeCnabText(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/gi, "c")
    .replace(/[^\x20-\x7E]/g, "")
    .toUpperCase();
}

function getCnabNamePreview(name: string) {
  return normalizeCnabText(name).slice(0, 30);
}

export function ImportExhibitorPayoutsDialog({ fairId }: { fairId: string }) {
  const [open, setOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRemittanceOpen, setIsRemittanceOpen] = useState(false);

  const previewMutation = usePreviewExhibitorPayoutsImportMutation(fairId);
  const confirmMutation = useConfirmExhibitorPayoutsImportMutation(fairId);
  const configQuery = useExhibitorPayoutImportConfigQuery(fairId);
  const updateConfigMutation = useUpdateExhibitorPayoutImportConfigMutation(fairId);

  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.spreadsheetId);
  const [sheetName, setSheetName] = useState(DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.sheetName);
  const [headerRow, setHeaderRow] = useState(DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.headerRow);
  const [dataStartRow, setDataStartRow] = useState(DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.dataStartRow);

  const preview = previewMutation.data;
  const validRowsCount = useMemo(() => {
    return preview?.summary.validCount ?? preview?.rows.filter((row) => row.status !== "INVALID").length ?? 0;
  }, [preview]);
  const rowsReadyForRemittance = useMemo(() => {
    return preview?.rows ?? [];
  }, [preview]);
  const rowsWithLongCnabName = useMemo(() => {
    return rowsReadyForRemittance.filter((row) => {
      const name = getPayoutName(getImportRowPayout(row));
      return normalizeCnabText(name).length > 30;
    });
  }, [rowsReadyForRemittance]);

  const hasCriticalErrors = useMemo(() => {
    return (preview?.summary.errorCount ?? 0) > 0 || preview?.rows.some((row) => row.status === "INVALID");
  }, [preview]);

  function openConfig() {
    const config = configQuery.data ?? DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG;
    setSpreadsheetId(config.spreadsheetId || DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.spreadsheetId);
    setSheetName(config.sheetName || DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.sheetName);
    setHeaderRow(config.headerRow || DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.headerRow);
    setDataStartRow(config.dataStartRow || DEFAULT_EXHIBITOR_PAYOUT_IMPORT_CONFIG.dataStartRow);
    setIsConfigOpen(true);
  }

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
        title: "Configuracao salva",
        description: "As configuracoes da planilha de repasses foram atualizadas.",
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
        title: "Nao foi possivel gerar a previa",
        description: getErrorMessage(err),
      });
    }
  }

  async function handleConfirm() {
    try {
      await confirmMutation.mutateAsync({ importValidRowsOnly: true });
      toast({
        variant: "success",
        title: "Repasses importados",
        description: "A lista foi atualizada com as linhas validas da planilha.",
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
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Configurar planilha de repasses</DialogTitle>
            <DialogDescription>
              Ajuste a origem Google Sheets usada na importacao. A leitura esperada e `Remessa Pix`!A3:D.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-blue-100 bg-blue-50 text-blue-900">
              <DatabaseZap className="h-4 w-4" />
              <AlertTitle>Compartilhamento necessario</AlertTitle>
              <AlertDescription className="text-blue-900/75">
                Compartilhe a planilha como Leitor com {SERVICE_ACCOUNT}.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Spreadsheet ID</Label>
              <Input value={spreadsheetId} onChange={(event) => setSpreadsheetId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nome da aba</Label>
              <Input value={sheetName} onChange={(event) => setSheetName(event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Linha do cabecalho</Label>
                <Input type="number" value={headerRow} onChange={(event) => setHeaderRow(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Linha inicial dos dados</Label>
                <Input type="number" value={dataStartRow} onChange={(event) => setDataStartRow(Number(event.target.value))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)} disabled={updateConfigMutation.isPending}>
              Voltar
            </Button>
            <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending || !spreadsheetId || !sheetName}>
              {updateConfigMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar configuracao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-10 rounded-lg">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar repasses
          </Button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[1180px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle>Importar repasses de expositores</DialogTitle>
              <DialogDescription>
                Esta importacao localiza expositores ja vinculados a feira e cria ou atualiza o repasse. Ela nao cadastra novos expositores.
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openConfig}>
              Configurar planilha
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto pr-1">
          <Alert className="shrink-0 border-blue-100 bg-blue-50 text-blue-900">
            <DatabaseZap className="h-4 w-4" />
            <AlertTitle>Fonte da importacao</AlertTitle>
            <AlertDescription className="text-blue-900/75">
              Configuracao atual: planilha `{spreadsheetId.slice(0, 10)}...`, aba `{sheetName}`, cabecalho na linha {headerRow} e dados a partir da linha {dataStartRow}. A planilha precisa estar compartilhada como Leitor com {SERVICE_ACCOUNT}.
            </AlertDescription>
          </Alert>

          <Alert className="shrink-0 border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nao cria novos expositores</AlertTitle>
            <AlertDescription className="text-amber-900/75">
              Se uma linha vier invalida por nao encontrar OwnerFair, vincule ou corrija o expositor na feira antes de confirmar a importacao.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handlePreview} disabled={previewMutation.isPending} className="h-10 rounded-lg">
              {previewMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {previewMutation.isPending ? "Lendo planilha e validando repasses..." : "Gerar previa"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRemittanceOpen(true)}
              disabled={!preview || rowsReadyForRemittance.length === 0}
              className="h-10 rounded-lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Gerar remessa da previa
            </Button>
          </div>

          {preview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <SupplierPaymentSummaryCard icon={FileSpreadsheet} label="Total" value={String(preview.summary.totalRows)} />
                <SupplierPaymentSummaryCard icon={UploadCloud} label="Validas" value={String(validRowsCount)} tone="success" />
                <SupplierPaymentSummaryCard icon={CheckCircle2} label="Novos" value={String(preview.summary.newCount)} tone="success" />
                <SupplierPaymentSummaryCard icon={RefreshCw} label="Atualizacoes" value={String(preview.summary.updateCount)} />
                <SupplierPaymentSummaryCard
                  icon={AlertTriangle}
                  label="Erros"
                  value={String(preview.summary.errorCount)}
                  tone={preview.summary.errorCount > 0 ? "danger" : "success"}
                />
                <SupplierPaymentSummaryCard
                  icon={AlertTriangle}
                  label="Avisos"
                  value={String(preview.summary.warningCount)}
                  tone={preview.summary.warningCount > 0 ? "warn" : "success"}
                />
              </div>

              {hasCriticalErrors ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTitle>Existem linhas com erro</AlertTitle>
                  <AlertDescription className="text-amber-900/75">
                    Apenas linhas validas serao importadas. Linhas sem OwnerFair precisam ser corrigidas no cadastro/vinculo do expositor antes.
                  </AlertDescription>
                </Alert>
              ) : null}

              {rowsWithLongCnabName.length > 0 ? (
                <Alert className="border-blue-100 bg-blue-50 text-blue-900">
                  <AlertTitle>Nome ajustado no arquivo CNAB</AlertTitle>
                  <AlertDescription className="text-blue-900/75">
                    {rowsWithLongCnabName.length} linha(s) tem nome com mais de 30 caracteres. O nome completo sera mantido na importacao, e o arquivo TXT usara a versao ajustada automaticamente. Previa: {getCnabNamePreview(getPayoutName(getImportRowPayout(rowsWithLongCnabName[0])))}.
                  </AlertDescription>
                </Alert>
              ) : null}

              <ImportExhibitorPayoutsPreviewTable rows={preview.rows} />
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={confirmMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!preview || confirmMutation.isPending || validRowsCount <= 0}>
            {confirmMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar importacao
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExhibitorPayoutPreviewRemittanceDialog
        open={isRemittanceOpen}
        onOpenChange={setIsRemittanceOpen}
        rows={preview?.rows ?? []}
      />
    </>
  );
}
