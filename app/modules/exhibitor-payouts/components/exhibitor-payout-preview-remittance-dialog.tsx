"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnitPriceInput } from "@/components/shared/unit-price-input";
import { toast } from "@/components/ui/toast/use-toast";
import { downloadBlob } from "@/app/shared/utils/download-blob";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import {
  EmpresaCnabInfo,
  ItauSispagPixService,
  PagamentoPixCnab,
} from "@/app/modules/financeiro/cnab/itau-sispag-pix.service";
import { processPixKeyStrict } from "@/app/modules/financeiro/cnab/cnab-utils";
import { RemittanceSplitConfig } from "../../pix-remittances/components/remittance-split-config";
import { RemittanceSummaryCard } from "../../pix-remittances/components/remittance-summary-card";
import type { PixRemittanceMode } from "../../pix-remittances/types";
import {
  formatDocument,
  formatMoneyBRLFromCents,
  getImportRowPayout,
  getPayoutDocument,
  getPayoutName,
  getPayoutPixKey,
  normalizeDigits,
  parsePayoutAmountCents,
  type ImportExhibitorPayoutRow,
} from "../exhibitor-payouts.schema";

const DEFAULT_EMPRESA: EmpresaCnabInfo = {
  nomeEmpresa: "ONLYINBR PRODUCOES CULTURAIS L",
  tipoInscricao: "2",
  numeroInscricao: "65.112.374/0001-44",
  agencia: "0062",
  conta: "98794",
  dac: "6",
  finalidadeLote: "PAGAMENTOS PIX",
  tipoPagamentoLote: "20",
};

type PreparedRow = {
  row: ImportExhibitorPayoutRow;
  id: number;
  name: string;
  document: string | null;
  pixKey: string | null;
  amountCents: number;
  errors: string[];
  warnings: string[];
};

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

function getTipoInscricaoFromDocumento(documento?: string | null): "1" | "2" | null {
  const digits = normalizeDigits(documento);
  if (digits.length === 11) return "1";
  if (digits.length === 14) return "2";
  return null;
}

function prepareRow(row: ImportExhibitorPayoutRow): PreparedRow {
  const payout = getImportRowPayout(row);
  const name = getPayoutName(payout);
  const document = getPayoutDocument(payout);
  const pixKey = getPayoutPixKey(payout);
  const amountCents = parsePayoutAmountCents(payout);
  const errors: string[] = [];
  const warnings = [...row.warnings];

  if (row.errors.length > 0) {
    warnings.push(...row.errors.map((error) => `Previa da importacao: ${error}`));
  }

  if (!name || name === "-") errors.push("Nome do titular nao informado.");
  if (!getTipoInscricaoFromDocumento(document)) errors.push("CPF/CNPJ do titular invalido ou ausente.");
  if (!pixKey) {
    errors.push("Chave Pix nao informada.");
  } else {
    try {
      processPixKeyStrict(pixKey);
    } catch (err) {
      errors.push(getErrorMessage(err));
    }
  }
  if (!Number.isFinite(amountCents) || amountCents <= 0) errors.push("Valor do repasse invalido.");

  if (normalizeCnabText(name).length > 30) {
    warnings.push(`O nome sera ajustado no CNAB: ${getCnabNamePreview(name)}.`);
  }

  return {
    row,
    id: row.rowNumber,
    name,
    document,
    pixKey,
    amountCents,
    errors,
    warnings,
  };
}

function buildPagamento(row: PreparedRow, amountCents: number): PagamentoPixCnab {
  const tipoInscricao = getTipoInscricaoFromDocumento(row.document);
  if (!tipoInscricao) throw new Error(`Linha ${row.id}: CPF/CNPJ do titular invalido.`);
  if (!row.pixKey) throw new Error(`Linha ${row.id}: chave Pix nao informada.`);
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error(`Linha ${row.id}: valor invalido.`);

  return {
    favorecidoNome: row.name,
    favorecidoTipoInscricao: tipoInscricao,
    favorecidoNumeroInscricao: normalizeDigits(row.document),
    pixKey: row.pixKey,
    valor: amountCents / 100,
    nossoNumero: `REP${String(row.id).padStart(7, "0")}`,
    dataPagamento: new Date(),
    finalidadeDetalhe: "PIX TRANSFERENCIA",
    avisoFavorecido: "0",
    moedaTipo: "009",
  };
}

export function ExhibitorPayoutPreviewRemittanceDialog({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ImportExhibitorPayoutRow[];
}) {
  const [mode, setMode] = useState<PixRemittanceMode>("SINGLE");
  const [selectedIds, setSelectedIds] = useState<Set<number> | null>(null);
  const [amountsCents, setAmountsCents] = useState<Record<number, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const preparedRows = useMemo(() => rows.map(prepareRow), [rows]);
  const eligibleRows = useMemo(
    () => preparedRows.filter((row) => row.errors.length === 0),
    [preparedRows],
  );
  const effectiveSelectedIds = useMemo(
    () => selectedIds ?? new Set(eligibleRows.map((row) => row.id)),
    [eligibleRows, selectedIds],
  );
  const selectedRows = useMemo(
    () => preparedRows.filter((row) => effectiveSelectedIds.has(row.id) && row.errors.length === 0),
    [effectiveSelectedIds, preparedRows],
  );

  const splitRows = useMemo(() => {
    if (mode === "SINGLE" || selectedRows.length === 0) {
      return { lote1: selectedRows, lote2: [] };
    }
    const half = Math.ceil(selectedRows.length / 2);
    return { lote1: selectedRows.slice(0, half), lote2: selectedRows.slice(half) };
  }, [mode, selectedRows]);

  const summary = useMemo(() => {
    const amountFor = (row: PreparedRow) => amountsCents[row.id] ?? row.amountCents;
    const totalRemittanceCents = selectedRows.reduce((acc, row) => acc + amountFor(row), 0);
    const totalLote1Cents = splitRows.lote1.reduce((acc, row) => acc + amountFor(row), 0);
    const totalLote2Cents = splitRows.lote2.reduce((acc, row) => acc + amountFor(row), 0);

    return {
      selectedCount: selectedRows.length,
      totalRemittanceCents,
      lote1Count: splitRows.lote1.length,
      totalLote1Cents,
      lote2Count: splitRows.lote2.length,
      totalLote2Cents,
      remittancesCount: mode === "SINGLE" ? 1 : 2,
    };
  }, [amountsCents, mode, selectedRows, splitRows]);

  const isAllEligibleSelected =
    eligibleRows.length > 0 && eligibleRows.every((row) => effectiveSelectedIds.has(row.id));

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setSelectedIds(null);
      setAmountsCents({});
      setMode("SINGLE");
    }
  }

  function toggleRow(row: PreparedRow) {
    if (row.errors.length > 0) return;

    setSelectedIds((current) => {
      const next = new Set(current ?? effectiveSelectedIds);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  }

  function toggleAllEligible() {
    setSelectedIds((current) => {
      if (isAllEligibleSelected) return new Set();
      return new Set([...(current ?? effectiveSelectedIds), ...eligibleRows.map((row) => row.id)]);
    });
  }

  async function handleGenerate() {
    if (selectedRows.length === 0) return;

    setIsGenerating(true);
    try {
      const groups = mode === "SPLIT_TWO"
        ? [splitRows.lote1, splitRows.lote2].filter((group) => group.length > 0)
        : [splitRows.lote1];

      const service = new ItauSispagPixService();
      groups.forEach((group, index) => {
        const pagamentos = group.map((row) => buildPagamento(row, amountsCents[row.id] ?? row.amountCents));
        const fileContent = service.generateFile(DEFAULT_EMPRESA, pagamentos);
        const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
        const suffix = groups.length > 1 ? `_LOTE_${index + 1}` : "";
        downloadBlob(blob, `REMESSA_REPASSES_EXPOSITORES${suffix}_${Date.now()}.txt`);
      });

      toast({
        variant: "success",
        title: "Remessa gerada",
        description: `${groups.length} arquivo(s) gerado(s) com ${selectedRows.length} linha(s) selecionada(s).`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Nao foi possivel gerar a remessa",
        description: getErrorMessage(err),
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <div className="border-b border-border p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl">Gerar remessa da previa</DialogTitle>
            <DialogDescription>
              Selecione as linhas da planilha que entrarao na remessa. Linhas com PIX invalido ou informacao obrigatoria ausente ficam bloqueadas.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50 lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-r border-border">
            <div className="flex items-center justify-between border-b border-border bg-white p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-preview-remittance"
                  checked={isAllEligibleSelected}
                  onCheckedChange={toggleAllEligible}
                  disabled={eligibleRows.length === 0}
                />
                <label htmlFor="select-all-preview-remittance" className="cursor-pointer text-sm font-medium text-slate-700">
                  Selecionar elegiveis ({eligibleRows.length})
                </label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                disabled={effectiveSelectedIds.size === 0}
                className="h-8 text-xs text-slate-500"
              >
                Limpar selecao
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {preparedRows.map((row) => {
                const disabled = row.errors.length > 0;
                const selected = effectiveSelectedIds.has(row.id);
                const amount = amountsCents[row.id] ?? row.amountCents;

                return (
                  <div
                    key={row.id}
                    className={`rounded-lg border bg-white p-4 shadow-sm ${disabled ? "border-amber-200 bg-amber-50/40" : "border-border"}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected}
                        disabled={disabled}
                        onCheckedChange={() => toggleRow(row)}
                        className="mt-1"
                      />

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full">Linha {row.id}</Badge>
                          {disabled ? (
                            <Badge variant="outline" className="gap-1 rounded-full border-amber-200 bg-amber-50 text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              Bloqueada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                              Elegivel
                            </Badge>
                          )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_150px_minmax(0,1fr)_150px] md:items-end">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{row.name}</div>
                            <div className="text-xs text-slate-500">{formatDocument(row.document)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Valor</div>
                            <UnitPriceInput
                              valueCents={amount}
                              disabled={disabled}
                              onChangeCents={(value) => setAmountsCents((current) => ({ ...current, [row.id]: value }))}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-slate-500">Chave Pix</div>
                            <div className="truncate font-mono text-xs text-slate-700">{row.pixKey ?? "-"}</div>
                          </div>
                          <div className="text-right text-sm font-semibold text-slate-900">
                            {formatMoneyBRLFromCents(amount)}
                          </div>
                        </div>

                        {row.warnings.length > 0 ? (
                          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                            {row.warnings.join(" ")}
                          </div>
                        ) : null}

                        {row.errors.length > 0 ? (
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            {row.errors.join(" ")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex w-full min-h-0 flex-col overflow-y-auto bg-white lg:w-[380px]">
            <div className="flex flex-col gap-6 p-6">
              <RemittanceSplitConfig
                mode={mode}
                onChangeMode={setMode}
                disabled={selectedRows.length === 0}
              />
              <RemittanceSummaryCard summary={summary} />
              {preparedRows.length > eligibleRows.length ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTitle>Linhas fora da remessa</AlertTitle>
                  <AlertDescription className="text-amber-900/75">
                    {preparedRows.length - eligibleRows.length} linha(s) precisam de correcao antes de entrar no arquivo.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-white p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={selectedRows.length === 0 || isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Gerar remessa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
