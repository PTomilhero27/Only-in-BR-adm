/**
 * Utilitários para a geração de arquivos CNAB.
 */

// Limpa todos os caracteres não numéricos
export function extractNumbers(str: string): string {
  return String(str ?? "").replace(/\D/g, "");
}

// Preenche com zeros à esquerda
export function padLeftZero(value: string | number, length: number): string {
  return String(value ?? "").padStart(length, "0").slice(0, length);
}

// Preenche com espaços em branco à direita
export function padRightSpace(value: string | number | null | undefined, length: number): string {
  return String(value ?? "").padEnd(length, " ").slice(0, length);
}

// Converte valor decimal para centavos, preenchido com zeros à esquerda
export function toCentsStr(value: number, length: number = 15): string {
  const cents = Math.round(value * 100);
  return padLeftZero(cents, length);
}

// Remove acentos
export function removeAccents(str: string): string {
  return String(str ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Texto CNAB genérico (não usar para chave PIX/e-mail)
export function formatText(str: string | null | undefined, length: number): string {
  if (!str) return padRightSpace("", length);

  let clean = removeAccents(str).toUpperCase();
  clean = clean.replace(/[^A-Z0-9 ]/g, " ");
  clean = clean.replace(/\s+/g, " ");

  return padRightSpace(clean.trim(), length);
}

// Data no formato DDMMAAAA
export function formatCnabDate(date: Date): string {
  const d = padLeftZero(date.getDate(), 2);
  const m = padLeftZero(date.getMonth() + 1, 2);
  const y = padLeftZero(date.getFullYear(), 4);
  return `${d}${m}${y}`;
}

// Hora no formato HHMMSS
export function formatCnabTime(date: Date): string {
  const h = padLeftZero(date.getHours(), 2);
  const m = padLeftZero(date.getMinutes(), 2);
  const s = padLeftZero(date.getSeconds(), 2);
  return `${h}${m}${s}`;
}

/**
 * CPF válido apenas para validação explícita.
 * Não deve ser usado para "adivinhar" telefone PIX.
 */
export function isValidCpf(cpfToTest: string): boolean {
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

export type PixKeyType = "01" | "02" | "03" | "04";

export interface ProcessPixKeyResult {
  type: PixKeyType;
  formattedKey: string;
}

/**
 * Regra do projeto:
 * - Telefone PIX sempre vem com 55
 * - Se vier "5511999999999", o sistema converte para "+5511999999999"
 * - Se já vier "+5511999999999", mantém
 *
 * Tipos:
 * 01 = Telefone
 * 02 = E-mail
 * 03 = CPF/CNPJ
 * 04 = Aleatória (UUID)
 *
 * Importante:
 * - O documento do favorecido e a chave PIX são independentes.
 * - Ex.: documento CPF + chave telefone é válido.
 * - Ex.: documento CPF + chave e-mail é válido.
 */
const PIX_PHONE_REGEX = /^\+55\d{10,11}$/;
// Ex.: +5511999999999

const PIX_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PIX_RANDOM_KEY_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Normaliza telefone PIX conforme a regra do projeto.
 *
 * Aceita:
 * - 5511999999999
 * - +5511999999999
 *
 * Retorna sempre:
 * - +5511999999999
 */
export function normalizeBrazilianPixPhone(raw: string): string {
  const value = String(raw ?? "").trim();

  if (!value) {
    throw new Error("Chave PIX telefone não informada.");
  }

  if (value.startsWith("+")) {
    const normalized = `+${extractNumbers(value)}`;

    if (!PIX_PHONE_REGEX.test(normalized)) {
      throw new Error(
        'Chave PIX telefone inválida. Use o padrão +55DDDNUMERO, ex.: "+5511999999999".'
      );
    }

    return normalized;
  }

  const digits = extractNumbers(value);

  if (!digits.startsWith("55")) {
    throw new Error(
      'Chave PIX telefone inválida. Neste sistema o telefone deve vir com 55 na frente, ex.: "5511999999999".'
    );
  }

  const normalized = `+${digits}`;

  if (!PIX_PHONE_REGEX.test(normalized)) {
    throw new Error(
      'Chave PIX telefone inválida. Use o padrão 55 + DDD + número, ex.: "5511999999999".'
    );
  }

  return normalized;
}

/**
 * Identifica e normaliza a chave PIX conforme a regra do projeto.
 *
 * Importante:
 * - telefone com 55 -> vira +55...
 * - telefone com +55 -> mantém
 * - NÃO assume telefone com 10/11 dígitos sem 55
 * - CPF/CNPJ continuam numéricos
 * - chave aleatória continua UUID
 * - em caso inválido, lança erro
 *
 * Regra de decisão:
 * - E-mail -> 02
 * - UUID -> 04
 * - Telefone -> só quando realmente tiver formato de telefone com país 55
 * - CPF/CNPJ -> 03
 */
export function processPixKeyStrict(pixKey: string): ProcessPixKeyResult {
  const raw = String(pixKey ?? "").trim();

  if (!raw) {
    throw new Error("Chave PIX não informada.");
  }

  // 1) E-mail
  if (raw.includes("@")) {
    if (raw.length > 77) {
      throw new Error("Chave PIX e-mail inválida. O tamanho máximo é 77 caracteres.");
    }

    if (!PIX_EMAIL_REGEX.test(raw)) {
      throw new Error("Chave PIX e-mail inválida.");
    }

    return {
      type: "02",
      formattedKey: raw,
    };
  }

  // 2) Aleatória (UUID)
  if (PIX_RANDOM_KEY_REGEX.test(raw)) {
    return {
      type: "04",
      formattedKey: raw.toLowerCase(),
    };
  }

  const digits = extractNumbers(raw);
  const onlyDigitsOrMask = /^[\d.\-\/()+\s]+$/.test(raw);

  // 3) Telefone
  // Para não confundir CPF começando com 55 com telefone,
  // só tratamos como telefone quando:
  // - vier com +55
  // - ou começar com 55 e tiver 12 ou 13 dígitos no total
  const looksLikePhone =
    raw.startsWith("+55") ||
    (digits.startsWith("55") && (digits.length === 12 || digits.length === 13));

  if (looksLikePhone) {
    return {
      type: "01",
      formattedKey: normalizeBrazilianPixPhone(raw),
    };
  }

  // 4) CPF/CNPJ
  if (onlyDigitsOrMask && digits.length === 11) {
    if (!isValidCpf(digits)) {
      throw new Error(
        "Chave PIX CPF inválida. Para CPF, informe 11 números válidos, sem pontos ou traços."
      );
    }

    return {
      type: "03",
      formattedKey: digits,
    };
  }

  if (onlyDigitsOrMask && digits.length === 14) {
    return {
      type: "03",
      formattedKey: digits,
    };
  }

  throw new Error(
    [
      "Chave PIX inválida para o layout Itaú.",
      "Formatos aceitos:",
      '- Telefone: "55DDDNUMERO" ou "+55DDDNUMERO"',
      "- E-mail: até 77 caracteres",
      "- CPF: 11 números sem máscara",
      "- CNPJ: 14 números sem máscara",
      "- Aleatória: UUID com 36 caracteres e hífens",
    ].join("\n")
  );
}

/**
 * Campo CHAVE PIX do Segmento B (posição 128-227, X(100)).
 * Não usar formatText(), porque chave PIX pode conter caracteres como "+", "@", ".", "-".
 */
export function formatPixKeyField(pixKey: string): string {
  const { formattedKey } = processPixKeyStrict(pixKey);
  return padRightSpace(formattedKey, 100);
}

/**
 * Campo TIPO CHAVE do Segmento B (posição 015-016, X(02)).
 */
export function getPixKeyTypeField(pixKey: string): PixKeyType {
  return processPixKeyStrict(pixKey).type;
}

/**
 * Identificação da transferência no Segmento A (pos. 113-114) para PIX.
 * Manual:
 * 01 = Conta corrente
 * PG = Conta pagamento
 * 03 = Conta poupança
 * 04 = Chave de endereçamento
 */
export type PixTransferIdentification = "01" | "PG" | "03" | "04";

/**
 * Câmara para PIX Transferência no Segmento A (pos. 018-020).
 * Manual: "009" – PIX (SPI)
 */
export const PIX_CAMARA_CENTRALIZADORA = "009";

/**
 * Helper para validar coerência do PIX no Segmento A/B.
 */
export function validatePixTransferLayout(params: {
  segmentAIdentification: PixTransferIdentification;
  hasSegmentB: boolean;
}): void {
  const { segmentAIdentification, hasSegmentB } = params;

  // Segmento B é obrigatório para PIX por chave
  if (segmentAIdentification === "04" && !hasSegmentB) {
    throw new Error(
      'Para PIX Transferência por chave, o Segmento B é obrigatório quando o Segmento A (113-114) for "04".'
    );
  }

  // Se não for por chave, não faz sentido usar essa estrutura de chave PIX
  if (segmentAIdentification !== "04" && hasSegmentB) {
    throw new Error(
      'O Segmento B de PIX por chave só deve ser usado quando o Segmento A (113-114) for "04".'
    );
  }
}