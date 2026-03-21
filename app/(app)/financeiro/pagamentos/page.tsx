"use client";

import { useMemo, useRef, useState } from "react";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Trash2, FileText, Info, AlertTriangle } from "lucide-react";

import {
  ItauSispagPixService,
  EmpresaCnabInfo,
  PagamentoPixCnab,
} from "@/app/modules/financeiro/cnab/itau-sispag-pix.service";
import {
  parseExcelPayments,
  ParsedExcelRow,
} from "@/app/modules/financeiro/cnab/excel-parser";

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

function onlyDigits(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

function getTipoInscricaoFromDocumento(documento: string): "1" | "2" | null {
  const digits = onlyDigits(documento);

  if (digits.length === 11) return "1";
  if (digits.length === 14) return "2";
  return null;
}

function formatMoneyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

function parseRawValueToNumber(value: string | number | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const raw = String(value).trim();
  const almostClean = raw.replace(/[^0-9.,\-]/g, "");
  if (!almostClean) return 0;

  if (almostClean.includes(",") && !almostClean.includes(".")) {
    const parsed = Number.parseFloat(almostClean.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (almostClean.includes(",") && almostClean.includes(".")) {
    const parsed = Number.parseFloat(almostClean.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number.parseFloat(almostClean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPagamentoValor(row: ParsedExcelRow): number {
  const valor =
    typeof row.pagamento?.valor === "number"
      ? row.pagamento.valor
      : typeof row.pagamento?.valorOriginal === "number"
      ? row.pagamento.valorOriginal
      : parseRawValueToNumber(row.rawValor);

  return Number.isFinite(valor) ? valor : 0;
}

function getErroValorLabel(row: ParsedExcelRow): string {
  const parsed = parseRawValueToNumber(row.rawValor);

  if (parsed > 0) {
    return formatMoneyBRL(parsed);
  }

  if (row.rawValor !== undefined && row.rawValor !== null && String(row.rawValor).trim() !== "") {
    return String(row.rawValor);
  }

  return "Inválido";
}

function buildPagamentoCnabFromRow(row: ParsedExcelRow): PagamentoPixCnab {
  if (!row.pagamento) {
    throw new Error(`Linha ${row.rowNumber}: pagamento ausente.`);
  }

  const documentoFonte =
    row.pagamento.favorecidoNumeroInscricao || row.favorecidoDoc || "";
  const documento = onlyDigits(documentoFonte);
  const tipoInscricao = getTipoInscricaoFromDocumento(documento);

  if (!tipoInscricao) {
    throw new Error(`Linha ${row.rowNumber}: CPF/CNPJ do favorecido inválido.`);
  }

  const valor = getPagamentoValor(row);

  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`Linha ${row.rowNumber}: valor do pagamento inválido.`);
  }

  return {
    favorecidoNome: row.pagamento.favorecidoNome,
    favorecidoTipoInscricao: tipoInscricao,
    favorecidoNumeroInscricao: documento,
    pixKey: row.pagamento.pixKey,
    valor,
    nossoNumero:
      row.pagamento.nossoNumero?.trim() ||
      `LINHA${String(row.rowNumber).padStart(6, "0")}`,
    dataPagamento: row.pagamento.dataPagamento ?? new Date(),
    txid: row.pagamento.txid ?? "",
    informacoesEntreUsuariosNumericas:
      row.pagamento.informacoesEntreUsuariosNumericas ?? "",
    finalidadeDetalhe: row.pagamento.finalidadeDetalhe ?? "PIX TRANSFERENCIA",
    avisoFavorecido: row.pagamento.avisoFavorecido ?? "0",
    moedaTipo: row.pagamento.moedaTipo ?? "009",
  };
}

export default function GeneralPaymentsPage() {
  const [parsedRows, setParsedRows] = useState<ParsedExcelRow[]>([]);
  const [empresaInfo, setEmpresaInfo] = useState<EmpresaCnabInfo>(DEFAULT_EMPRESA);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcelPayments(file);
      setParsedRows(rows);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "Erro ao ler a planilha. Verifique o arquivo e tente novamente.";

      alert(message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearData = () => {
    if (confirm("Deseja realmente limpar as planilhas importadas?")) {
      setParsedRows([]);
    }
  };

  const validas = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const invalidos = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);

  const totalValido = useMemo(() => {
    return validas.reduce((acc, curr) => acc + getPagamentoValor(curr), 0);
  }, [validas]);

  const formattedTotal = useMemo(() => formatMoneyBRL(totalValido), [totalValido]);

  const handleDownloadCnab = () => {
    if (validas.length === 0) {
      alert("Nenhum pagamento válido na planilha para gerar o arquivo.");
      return;
    }

    setDownloading(true);

    try {
      const pagamentosCnab: PagamentoPixCnab[] = validas.map(buildPagamentoCnabFromRow);

      const service = new ItauSispagPixService();
      const fileContent = service.generateFile(empresaInfo, pagamentosCnab);

      const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `REMESSA_ITAU_PIX_${Date.now()}.txt`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao gerar CNAB:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Erro ao processar as regras do CNAB. Verifique o log do sistema.";

      alert(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen space-y-8 bg-zinc-50 p-6 text-slate-800 md:p-8">
      <AppBreadcrumb
        items={[
          { label: "home", href: "/dashboard" },
          { label: "Financeiro", href: "/financeiro" },
          { label: "Pagamentos" },
        ]}
      />

      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Gerador Itaú PIX CNAB 240
        </h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Importe a planilha, confira os pagamentos válidos e gere o arquivo CNAB PIX
          no layout de remessa do Itaú.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-md border bg-white p-4 text-sm text-slate-700 shadow-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-900">Arquivo exclusivo para PIX</span>
          <span className="text-slate-500">
            Este gerador monta remessa PIX em arquivo separado, com Segmento A + Segmento B
            para pagamentos por chave.
          </span>
          <span className="text-slate-500">
            O documento do favorecido e a chave PIX são independentes entre si.
          </span>
          <span className="text-slate-500">
            Exemplos válidos: CPF + telefone, CPF + e-mail, CNPJ + telefone, CNPJ + chave
            aleatória.
          </span>
          <span className="text-slate-500">
            Para chave PIX telefone, o número deve vir com 55 e será normalizado no arquivo
            para o padrão +55DDDNUMERO.
          </span>
          <span className="text-slate-500">
            Empresa: {empresaInfo.nomeEmpresa} • Agência {empresaInfo.agencia} • Conta{" "}
            {empresaInfo.conta}-{empresaInfo.dac} • CNPJ {empresaInfo.numeroInscricao}.
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-200/60 shadow-sm md:col-span-2">
          <CardContent className="flex flex-col items-start gap-5 pb-8 pt-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
              <FileText className="h-5 w-5 text-slate-500" />
              1. Importar planilha
            </h2>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileUpload}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 bg-slate-900 px-6 shadow hover:bg-slate-800"
            >
              <Upload className="h-4 w-4" />
              Selecionar arquivo
            </Button>

            <p className="text-sm text-slate-400">
              Arquivos aceitos: .xlsx, .xls e .csv. A primeira aba é usada automaticamente.
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center border-slate-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-slate-800">Resumo</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-0 text-[15px] font-medium text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-normal text-slate-500">Linhas PIX</span>
              <span className="text-slate-900">{parsedRows.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-normal text-slate-500">Válidas</span>
              <span className="text-slate-900">{validas.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-normal text-slate-500">Com erro</span>
              <span className="text-slate-900">{invalidos.length}</span>
            </div>

            <Separator className="my-2 bg-slate-200" />

            <div className="flex items-center justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formattedTotal}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-xl font-semibold text-slate-800">
            2. Conta debitada
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-6 pb-6 pt-0 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="font-medium text-slate-500">Empresa</Label>
            <Input
              className="border-slate-200 bg-slate-50/50 text-slate-800"
              value={empresaInfo.nomeEmpresa}
              onChange={(e) =>
                setEmpresaInfo((prev) => ({ ...prev, nomeEmpresa: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-slate-500">CNPJ</Label>
            <Input
              className="border-slate-200 bg-slate-50/50 text-slate-800"
              value={empresaInfo.numeroInscricao}
              onChange={(e) =>
                setEmpresaInfo((prev) => ({ ...prev, numeroInscricao: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-slate-500">Agência</Label>
            <Input
              className="border-slate-200 bg-slate-50/50 text-slate-800"
              value={empresaInfo.agencia}
              onChange={(e) =>
                setEmpresaInfo((prev) => ({ ...prev, agencia: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 space-y-1.5">
              <Label className="font-medium text-slate-500">Conta</Label>
              <Input
                className="border-slate-200 bg-slate-50/50 text-slate-800"
                value={empresaInfo.conta}
                onChange={(e) =>
                  setEmpresaInfo((prev) => ({ ...prev, conta: e.target.value }))
                }
              />
            </div>

            <div className="col-span-1 space-y-1.5">
              <Label className="font-medium text-slate-500">DAC</Label>
              <Input
                className="border-slate-200 bg-slate-50/50 text-slate-800"
                value={empresaInfo.dac}
                onChange={(e) =>
                  setEmpresaInfo((prev) => ({ ...prev, dac: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-xl font-semibold text-slate-800">
            3. Conferência dos pagamentos PIX
          </CardTitle>
        </CardHeader>

        <CardContent className="px-0 pb-6 pt-4 sm:px-6">
          <Tabs defaultValue="validas" className="w-full">
            <TabsList className="mb-4 h-auto w-full justify-start space-x-6 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="validas"
                className="rounded-none border-slate-900 px-1 pb-3 pt-2 text-[15px] font-medium text-slate-500 data-[state=active]:border-b-2 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
              >
                Válidas ({validas.length})
              </TabsTrigger>

              <TabsTrigger
                value="erros"
                className="rounded-none border-slate-900 px-1 pb-3 pt-2 text-[15px] font-medium text-slate-500 data-[state=active]:border-b-2 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
              >
                Com erro ({invalidos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="validas" className="mt-0">
              {validas.length === 0 ? (
                <div className="rounded-md border bg-white px-4 py-10 text-center text-sm font-medium text-slate-500">
                  Nenhuma linha pronta ou processada.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b bg-slate-50 text-slate-500">
                      <tr>
                        <th className="w-12 border-r p-3 text-center font-semibold">#</th>
                        <th className="whitespace-nowrap p-3 font-semibold">PDV</th>
                        <th className="p-3 font-semibold">Nome</th>
                        <th className="p-3 font-semibold">CPF/CNPJ Favorecido</th>
                        <th className="p-3 font-semibold">Chave PIX</th>
                        <th className="w-16 p-3 text-center font-semibold">Tipo</th>
                        <th className="w-24 p-3 text-center font-semibold">Data</th>
                        <th className="whitespace-nowrap p-3 text-right font-semibold">Valor</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {validas.map((r) => {
                        const valor = getPagamentoValor(r);

                        return (
                          <tr
                            key={r.rowNumber}
                            className="transition-colors hover:bg-slate-50/50"
                          >
                            <td className="border-r p-3 text-center text-slate-400">
                              {r.rowNumber}
                            </td>
                            <td className="whitespace-nowrap p-3 font-medium text-slate-700">
                              {r.pdvNome}
                            </td>
                            <td className="p-3 text-slate-900">
                              {r.pagamento?.favorecidoNome}
                            </td>
                            <td className="p-3 text-slate-600">
                              {r.pagamento?.favorecidoNumeroInscricao ||
                                r.favorecidoDoc ||
                                "-"}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-600">
                              {r.pagamento?.pixKey}
                            </td>
                            <td className="p-3 text-center font-medium text-slate-500">PIX</td>
                            <td className="whitespace-nowrap p-3 text-center text-slate-500">
                              {(r.pagamento?.dataPagamento ?? new Date()).toLocaleDateString(
                                "pt-BR"
                              )}
                            </td>
                            <td className="whitespace-nowrap p-3 text-right font-semibold text-slate-900">
                              {formatMoneyBRL(valor)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="erros" className="mt-0 space-y-4">
              {invalidos.length === 0 ? (
                <div className="rounded-md border bg-white px-4 py-10 text-center text-sm font-medium text-slate-500">
                  Nenhum erro encontrado 🎉
                </div>
              ) : (
                <div className="space-y-4">
                  {invalidos.map((r) => (
                    <div
                      key={r.rowNumber}
                      className="space-y-3 rounded-md border border-red-200 bg-red-50/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <h3 className="rounded border bg-white px-2 py-1 text-sm font-semibold text-slate-900 shadow-sm">
                          Linha {r.rowNumber}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Erros detectados
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 border-b border-red-200/50 pb-3 text-[13px] md:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="mb-0.5 text-xs text-slate-500">Nome Favorecido</p>
                          <p className="font-medium text-slate-900">{r.rawNome || "-"}</p>
                        </div>

                        <div>
                          <p className="mb-0.5 text-xs text-slate-500">PDV / Box</p>
                          <p className="font-medium text-slate-900">{r.pdvNome || "-"}</p>
                        </div>

                        <div>
                          <p className="mb-0.5 text-xs text-slate-500">Documento Identificado</p>
                          <p className="mt-1 font-mono text-xs text-slate-800">
                            {r.favorecidoDoc || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="mb-0.5 text-xs text-slate-500">Chave PIX Informada</p>
                          <p className="break-all font-mono text-xs text-slate-800">
                            {r.rawChavePix || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="mb-0.5 text-xs text-slate-500">Valor Bruto Lançado</p>
                          <p className="font-medium text-slate-800">{getErroValorLabel(r)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 text-[13px] md:grid-cols-2">
                        <div>
                          <p className="mb-0.5 text-xs text-slate-500">Tipo de Transferência</p>
                          <p className="font-medium text-slate-900">
                            {r.rawTipoTransferencia || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="mb-0.5 text-xs text-slate-500">Linha Original</p>
                          <p className="break-all text-xs text-slate-700">{r.originalData}</p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-bold text-red-800">
                          Motivos de bloqueio da linha:
                        </p>
                        <ul className="ml-1 list-inside list-disc space-y-0.5 text-xs text-red-700">
                          {r.errors.map((e, idx) => (
                            <li key={idx}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 pb-2 shadow-sm">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-xl font-semibold text-slate-800">
            4. Gerar remessa
          </CardTitle>
        </CardHeader>

        <CardContent className="flex w-full flex-col items-start gap-4 pt-0 md:flex-row md:items-center">
          <Button
            onClick={handleDownloadCnab}
            disabled={downloading || validas.length === 0}
            className="gap-2 bg-slate-500 px-6 font-medium text-white shadow hover:bg-slate-600"
          >
            Gerar TXT CNAB 240
          </Button>

          <Button
            variant="outline"
            disabled={downloading || validas.length === 0}
            onClick={handleDownloadCnab}
            className="gap-2 bg-white text-slate-600"
          >
            <Download className="h-4 w-4" />
            Baixar TXT
          </Button>

          <Button variant="outline" disabled className="gap-2 bg-white text-slate-600">
            <FileText className="h-4 w-4" />
            Baixar Word
          </Button>

          <div className="flex-grow" />

          <Button
            variant="ghost"
            onClick={clearData}
            disabled={parsedRows.length === 0}
            className="gap-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
        </CardContent>

        <CardContent className="space-y-1 pb-6 pt-0 text-[13px] font-medium text-orange-600">
          <p>Confira o mapeamento das colunas obrigatórias antes de gerar o arquivo.</p>
          <p>
            O documento do favorecido e a chave PIX podem ser diferentes entre si
            (ex.: CNPJ + e-mail, CPF + telefone).
          </p>
          <p>
            Para telefone PIX, a chave deve vir com 55 e será enviada no CNAB no formato
            +55DDDNUMERO.
          </p>
        </CardContent>
      </Card>

      <div className="h-6" />
    </div>
  );
}