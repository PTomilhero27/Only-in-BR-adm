import * as XLSX from "xlsx";
import { extractNumbers, formatText } from "./cnab-utils";
import { PagamentoPixCnab } from "./itau-sispag-pix.service";

export interface ParsedPagamentoPreview extends PagamentoPixCnab {
  valorOriginal: number;
}

export interface ParsedExcelRow {
  rowNumber: number;
  originalData: string;
  isValid: boolean;
  errors: string[];
  pagamento?: ParsedPagamentoPreview;
  pdvNome?: string;
  favorecidoDoc?: string;
  rawNome?: string;
  rawChavePix?: string;
  rawValor?: string | number;
  rawTipoTransferencia?: string;
}

const COL_MAPPING = {
  pdv: ["pdv", "ponto de venda", "barraca", "box", "identificador"],
  nome: [
    "nome",
    "razao social",
    "favorecido",
    "cliente",
    "nome / razao social do favorecido",
    "nome favorecido",
  ],
  documento: [
    "cpf",
    "cnpj",
    "documento",
    "doc",
    "cpf / cnpj",
    "cpf - conta física / cnpj - conta jurídica",
  ],
  tipoTransferencia: ["tipo de transferencia", "tipo transferencia", "transferencia", "tipo"],
  chavePix: ["chave pix", "chave", "pix", "chave pix do titular"],
  valor: ["valor", "quantia", "montante"],
} as const;

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function findColumnIndex(headers: string[], possibleNames: readonly string[]): number {
  return headers.findIndex((header) => {
    const cleanHeader = normalizeHeader(header);
    if (!cleanHeader) return false;

    return possibleNames.some((possibleName) => {
      const cleanPossibleName = normalizeHeader(possibleName);
      return cleanHeader.includes(cleanPossibleName);
    });
  });
}

function parseBrazilianCurrency(val: unknown): number {
  if (typeof val === "number") return val;
  if (val === null || val === undefined || val === "") return 0;

  const raw = String(val).trim();
  const almostClean = raw.replace(/[^0-9.,\-]/g, "");
  if (!almostClean) return 0;

  if (almostClean.includes(",") && !almostClean.includes(".")) {
    return Number.parseFloat(almostClean.replace(",", "."));
  }

  if (almostClean.includes(",") && almostClean.includes(".")) {
    return Number.parseFloat(almostClean.replace(/\./g, "").replace(",", "."));
  }

  return Number.parseFloat(almostClean);
}

function getTipoInscricao(documento: string): "1" | "2" | null {
  if (documento.length === 11) return "1";
  if (documento.length === 14) return "2";
  return null;
}

function isValidCpf(cpfToTest: string): boolean {
  const cpf = extractNumbers(cpfToTest);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let rest = 0;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Regra do projeto:
 * - telefone PIX sempre vem com 55
 * - o parser garante o "+"
 * Exemplos válidos:
 * - 5511999999999  -> +5511999999999
 * - +5511999999999 -> +5511999999999
 */
function normalizeBrazilianPixPhone(raw: string): string {
  const value = String(raw ?? "").trim();

  if (!value) {
    throw new Error("Telefone PIX não informado.");
  }

  if (value.startsWith("+")) {
    const normalized = `+${extractNumbers(value)}`;

    if (!/^\+55\d{10,11}$/.test(normalized)) {
      throw new Error(
        'Telefone PIX inválido. Use o padrão +55DDDNUMERO, ex.: "+5511999999999".'
      );
    }

    return normalized;
  }

  const digits = extractNumbers(value);

  if (!digits.startsWith("55")) {
    throw new Error(
      'Telefone PIX inválido. Neste sistema ele deve vir com 55 na frente, ex.: "5511999999999".'
    );
  }

  const normalized = `+${digits}`;

  if (!/^\+55\d{10,11}$/.test(normalized)) {
    throw new Error(
      'Telefone PIX inválido. Use o padrão 55 + DDD + número, ex.: "5511999999999".'
    );
  }

  return normalized;
}

/**
 * Documento do favorecido e chave PIX são independentes.
 * Ex.:
 * - documento = CPF e chave = telefone
 * - documento = CPF e chave = e-mail
 * - documento = CNPJ e chave = telefone
 *
 * Para evitar conflito com CPF/CNPJ:
 * - telefone só é telefone se vier com +55
 * - ou com 55 e tamanho total de telefone BR com país (12 ou 13 dígitos)
 */
function inferPixKeyTypeCodeStrict(pixKey: string): "01" | "02" | "03" | "04" | null {
  const key = String(pixKey ?? "").trim();
  if (!key) return null;

  if (key.includes("@")) {
    return "02";
  }

  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key)) {
    return "04";
  }

  const digits = extractNumbers(key);
  const onlyDigitsOrMask = /^[\d.\-\/()+\s]+$/.test(key);

  const looksLikeBrazilPhone =
    key.startsWith("+55") ||
    (digits.startsWith("55") && (digits.length === 12 || digits.length === 13));

  if (looksLikeBrazilPhone) {
    return "01";
  }

  if (onlyDigitsOrMask && (digits.length === 11 || digits.length === 14)) {
    return "03";
  }

  return null;
}

function validateFavorecidoDocumento(rawDoc: string): string[] {
  const errors: string[] = [];
  const cleanDoc = extractNumbers(rawDoc);

  if (!cleanDoc) {
    errors.push("Documento (CPF/CNPJ) do favorecido não informado.");
    return errors;
  }

  if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    errors.push(
      `Documento (CPF/CNPJ) inválido. Exigidos 11 ou 14 dígitos, foram encontrados ${cleanDoc.length}.`
    );
    return errors;
  }

  if (cleanDoc.length === 11 && !isValidCpf(cleanDoc)) {
    errors.push("CPF do favorecido inválido.");
  }

  return errors;
}

function validatePixKey(rawChavePix: string): string[] {
  const errors: string[] = [];
  const key = String(rawChavePix ?? "").trim();

  if (!key) {
    errors.push("Chave PIX não informada ou vazia.");
    return errors;
  }

  const typeCode = inferPixKeyTypeCodeStrict(key);

  if (!typeCode) {
    errors.push(
      "Chave PIX inválida. Use telefone com 55, e-mail, CPF/CNPJ ou chave aleatória UUID."
    );
    return errors;
  }

  if (typeCode === "01") {
    try {
      normalizeBrazilianPixPhone(key);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Telefone PIX inválido.");
    }
  }

  if (typeCode === "02") {
    if (key.length > 77) {
      errors.push("E-mail PIX inválido. O tamanho máximo aceito é 77 caracteres.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
      errors.push("E-mail PIX inválido.");
    }
  }

  if (typeCode === "03") {
    const keyDigits = extractNumbers(key);

    if (keyDigits.length !== 11 && keyDigits.length !== 14) {
      errors.push("Chave PIX CPF/CNPJ inválida. Deve conter 11 ou 14 dígitos.");
    }

    if (keyDigits.length === 11 && !isValidCpf(keyDigits)) {
      errors.push("Chave PIX CPF inválida.");
    }
  }

  return errors;
}

function normalizePixKeyForPreview(rawPixKey: string): string {
  const key = String(rawPixKey ?? "").trim();
  const typeCode = inferPixKeyTypeCodeStrict(key);

  if (!typeCode) return key;

  if (typeCode === "01") {
    return normalizeBrazilianPixPhone(key);
  }

  if (typeCode === "02") {
    return key;
  }

  if (typeCode === "03") {
    return extractNumbers(key);
  }

  if (typeCode === "04") {
    return key.toLowerCase();
  }

  return key;
}

export async function parseExcelPayments(file: File): Promise<ParsedExcelRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  if (workbook.SheetNames.length === 0) {
    throw new Error("A planilha não possui abas visíveis.");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (rawRows.length === 0) return [];

  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i] ?? [];

    const isHeaderRow = row.some((cell) => {
      const clean = normalizeHeader(cell);
      return (
        clean.includes("pdv") ||
        clean.includes("nome") ||
        clean.includes("documento") ||
        clean.includes("chavepix") ||
        clean.includes("cpfcnpj") ||
        clean.includes("valor")
      );
    });

    if (isHeaderRow) {
      headerRowIndex = i;
      headers = row.map((cell) => String(cell ?? ""));
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "Não foi possível encontrar o cabeçalho da planilha. Verifique se as colunas estão preenchidas."
    );
  }

  const colPdvIdx = findColumnIndex(headers, COL_MAPPING.pdv);
  const colNomeIdx = findColumnIndex(headers, COL_MAPPING.nome);
  const colDocIdx = findColumnIndex(headers, COL_MAPPING.documento);
  const colTipoIdx = findColumnIndex(headers, COL_MAPPING.tipoTransferencia);
  const colChavePixIdx = findColumnIndex(headers, COL_MAPPING.chavePix);
  const colValorIdx = findColumnIndex(headers, COL_MAPPING.valor);

  const missingColumns: string[] = [];
  if (colNomeIdx === -1) missingColumns.push("Nome");
  if (colDocIdx === -1) missingColumns.push("CPF/CNPJ");
  if (colTipoIdx === -1) missingColumns.push("Tipo de transferência");
  if (colChavePixIdx === -1) missingColumns.push("Chave PIX");
  if (colValorIdx === -1) missingColumns.push("Valor");

  if (missingColumns.length > 0) {
    throw new Error(`Faltam colunas essenciais na planilha: ${missingColumns.join(", ")}.`);
  }

  const parsedRows: ParsedExcelRow[] = [];

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i] ?? [];
    const rowNumber = i + 1;
    const errors: string[] = [];

    const rawPdv = colPdvIdx !== -1 ? String(row[colPdvIdx] ?? "").trim() : "";
    const rawNome = colNomeIdx !== -1 ? String(row[colNomeIdx] ?? "").trim() : "";
    const rawDoc = colDocIdx !== -1 ? String(row[colDocIdx] ?? "").trim() : "";
    const rawTipo = colTipoIdx !== -1 ? String(row[colTipoIdx] ?? "").trim() : "";
    const rawChavePix = colChavePixIdx !== -1 ? String(row[colChavePixIdx] ?? "").trim() : "";
    const rawValor = colValorIdx !== -1 ? row[colValorIdx] : 0;

    const rowLooksEmpty =
      !rawPdv && !rawNome && !rawDoc && !rawTipo && !rawChavePix && !rawValor;

    if (rowLooksEmpty) continue;

    if (
      rawNome.toUpperCase().includes("EXEMPLO") ||
      rawPdv.toUpperCase().includes("EXEMPLO") ||
      rawChavePix.toUpperCase().includes("EXEMPLO")
    ) {
      errors.push("Linha ignorada por conter indicativos de ser um 'EXEMPLO'.");
    }

    if (!rawNome) {
      errors.push("Nome do favorecido não pode estar vazio.");
    }

    const cleanDoc = extractNumbers(rawDoc);
    const tipoInscricao = getTipoInscricao(cleanDoc);

    errors.push(...validateFavorecidoDocumento(rawDoc));

    if (rawTipo.toUpperCase() !== "PIX") {
      errors.push(
        `Tipo de transferência inválido: "${rawTipo}". OBRIGATÓRIO ser apenas "PIX".`
      );
    }

    const valorNum = parseBrazilianCurrency(rawValor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      errors.push(
        `Valor do pagamento menor ou igual a zero, faltante, ou formato inválido: "${String(
          rawValor
        )}".`
      );
    }

    errors.push(...validatePixKey(rawChavePix));

    const isValid = errors.length === 0;

    const pagamento: ParsedPagamentoPreview | undefined = isValid
      ? {
          favorecidoNome: formatText(rawNome, 30).trim(),
          favorecidoTipoInscricao: tipoInscricao!,
          favorecidoNumeroInscricao: cleanDoc,
          pixKey: normalizePixKeyForPreview(rawChavePix),
          valor: valorNum,
          valorOriginal: valorNum,
          nossoNumero: formatText((rawPdv || `LINHA${rowNumber}`).substring(0, 20), 20),
          dataPagamento: new Date(),
          txid: "",
          informacoesEntreUsuariosNumericas: "",
          finalidadeDetalhe: "PIX TRANSFERENCIA",
          avisoFavorecido: "0",
          moedaTipo: "009",
        }
      : undefined;

    parsedRows.push({
      rowNumber,
      originalData: row.map((cell) => String(cell ?? "")).join(" | "),
      isValid,
      errors,
      pdvNome: formatText(rawPdv || "PDV DESCONHECIDO", 30).trim(),
      favorecidoDoc: rawDoc || cleanDoc,
      rawNome,
      rawChavePix,
      rawValor: rawValor as string | number,
      rawTipoTransferencia: rawTipo,
      pagamento,
    });
  }

  return parsedRows;
}