/**
 * Geração CNAB 240 Itaú SISPAG - PIX Transferência por Chave
 *
 * Referência:
 * Manual Técnico SISPAG Itaú CNAB 240 v086 (mai/2022)
 * - PIX em arquivo separado
 * - Segmento A obrigatório
 * - Segmento B obrigatório para PIX por chave
 * - Header arquivo = 240
 * - Header lote layout 040
 * - Trailer lote = 240
 * - Registros alfanuméricos com espaços à direita
 * - Registros numéricos com zeros à esquerda
 *
 * Regras do projeto:
 * - O documento do favorecido e a chave PIX são independentes
 * - Segmento B usa o MESMO número sequencial do Segmento A correspondente
 * - Telefone PIX:
 *   - pode vir como 5511999999999
 *   - pode vir como +5511999999999
 *   - no CNAB sempre será gravada como +5511999999999
 */

export interface EmpresaCnabInfo {
  nomeEmpresa: string;
  tipoInscricao: "1" | "2";
  numeroInscricao: string;
  agencia: string;
  conta: string;
  dac: string;
  codigoTransmissao?: string;
  identificacaoLancamentoExtrato?: string;
  finalidadeLote?: string;
  historicoCc?: string;
  endereco?: string;
  numeroEndereco?: string;
  complementoEndereco?: string;
  cidade?: string;
  cep?: string;
  estado?: string;
  tipoPagamentoLote?: string;
  densidadeGravacao?: string;
}

export interface PagamentoPixCnab {
  favorecidoNome: string;
  favorecidoTipoInscricao: "1" | "2";
  favorecidoNumeroInscricao: string;
  pixKey: string;
  valor: number;
  nossoNumero?: string;
  dataPagamento?: Date;
  txid?: string;
  informacoesEntreUsuariosNumericas?: string;
  finalidadeDetalhe?: string;
  avisoFavorecido?: "0" | "1" | "2" | "3" | "4" | "5";
  moedaTipo?: "REA" | "009";
  ispbFavorecido?: string;
}

type PixKeyTypeCode = "01" | "02" | "03" | "04";
type FieldKind = "num" | "alf";

interface PixKeyInfo {
  typeCode: PixKeyTypeCode;
  formattedKey: string;
}

interface RecordField {
  kind: FieldKind;
  length: number;
  value?: string | number;
  preserve?: boolean; // usar true para campos como chave PIX / txid
}

export class ItauSispagPixService {
  private static readonly CODIGO_BANCO = "341";
  private static readonly LAYOUT_ARQUIVO = "080";
  private static readonly LAYOUT_LOTE_PIX = "040";
  private static readonly FORMA_PAGAMENTO_PIX_TRANSFERENCIA = "45";
  private static readonly TIPO_OPERACAO_CREDITO = "C";
  private static readonly CAMARA_SPI = "009";
  private static readonly IDENTIFICACAO_TRANSFERENCIA_PIX = "04";
  private static readonly TIPO_MOVIMENTO_INCLUSAO = "000";

  public generateFile(empresa: EmpresaCnabInfo, pagamentos: PagamentoPixCnab[]): string {
    this.validateEmpresa(empresa);

    if (!pagamentos.length) {
      throw new Error("É necessário informar ao menos um pagamento PIX.");
    }

    const now = new Date();
    const lote = 1;
    let sequencialRegistro = 1;

    const lines: string[] = [];

    lines.push(this.generateHeaderArquivo(empresa, now));
    lines.push(this.generateHeaderLote(empresa, lote));

    let quantidadeSegmentos = 0;
    let somatorioValoresCents = 0;

    for (const pagamento of pagamentos) {
      this.validatePagamento(pagamento);

      const valorCents = this.toCentsInt(pagamento.valor);
      somatorioValoresCents += valorCents;

      const numeroRegistro = sequencialRegistro;

      lines.push(this.generateSegmentoA(pagamento, lote, numeroRegistro));
      quantidadeSegmentos++;

      lines.push(this.generateSegmentoB(pagamento, lote, numeroRegistro));
      quantidadeSegmentos++;

      sequencialRegistro++;
    }

    const quantidadeRegistrosLote = 1 + quantidadeSegmentos + 1;
    lines.push(this.generateTrailerLote(lote, quantidadeRegistrosLote, somatorioValoresCents));

    const quantidadeRegistrosArquivo = lines.length + 1;
    const quantidadeLotesArquivo = 1;
    lines.push(this.generateTrailerArquivo(quantidadeLotesArquivo, quantidadeRegistrosArquivo));

    const validated = lines.map((line, idx) => this.ensure240(line, idx + 1));

    // CRLF final ajuda a evitar rejeição do último registro
    return `${validated.join("\r\n")}\r\n`;
  }

  private generateHeaderArquivo(emp: EmpresaCnabInfo, dataGeracao: Date): string {
    return this.buildRecord([
      { kind: "num", length: 3, value: ItauSispagPixService.CODIGO_BANCO },
      { kind: "num", length: 4, value: "0000" },
      { kind: "num", length: 1, value: "0" },
      { kind: "alf", length: 6, value: "" },
      { kind: "num", length: 3, value: ItauSispagPixService.LAYOUT_ARQUIVO },
      { kind: "num", length: 1, value: emp.tipoInscricao },
      { kind: "num", length: 14, value: this.onlyDigits(emp.numeroInscricao) },
      { kind: "alf", length: 20, value: "" },
      { kind: "num", length: 5, value: this.onlyDigits(emp.agencia) },
      { kind: "alf", length: 1, value: "" },
      { kind: "num", length: 12, value: this.onlyDigits(emp.conta) },
      { kind: "alf", length: 1, value: "" },
      { kind: "num", length: 1, value: this.onlyDigits(emp.dac) },
      { kind: "alf", length: 30, value: emp.nomeEmpresa },
      { kind: "alf", length: 30, value: "BANCO ITAU SA" },
      { kind: "alf", length: 10, value: "" },
      { kind: "num", length: 1, value: "1" },
      { kind: "num", length: 8, value: this.formatDate(dataGeracao) },
      { kind: "num", length: 6, value: this.formatTime(dataGeracao) },
      { kind: "num", length: 9, value: "0" },
      { kind: "num", length: 5, value: this.onlyDigits(emp.densidadeGravacao ?? "0") },
      { kind: "alf", length: 69, value: "" },
    ]);
  }

  private generateHeaderLote(emp: EmpresaCnabInfo, lote: number): string {
    const tipoPagamento = this.zeroPad(emp.tipoPagamentoLote ?? "20", 2);
    const identificacaoLancamento =
      emp.identificacaoLancamentoExtrato ?? emp.codigoTransmissao ?? "";
    const finalidadeLote = emp.finalidadeLote ?? "PAGAMENTOS PIX";

    return this.buildRecord([
      { kind: "num", length: 3, value: ItauSispagPixService.CODIGO_BANCO },
      { kind: "num", length: 4, value: lote },
      { kind: "num", length: 1, value: "1" },
      { kind: "alf", length: 1, value: ItauSispagPixService.TIPO_OPERACAO_CREDITO },
      { kind: "num", length: 2, value: tipoPagamento },
      { kind: "num", length: 2, value: ItauSispagPixService.FORMA_PAGAMENTO_PIX_TRANSFERENCIA },
      { kind: "num", length: 3, value: ItauSispagPixService.LAYOUT_LOTE_PIX },
      { kind: "alf", length: 1, value: "" },
      { kind: "num", length: 1, value: emp.tipoInscricao },
      { kind: "num", length: 14, value: this.onlyDigits(emp.numeroInscricao) },
      { kind: "alf", length: 4, value: identificacaoLancamento },
      { kind: "alf", length: 16, value: "" },
      { kind: "num", length: 5, value: this.onlyDigits(emp.agencia) },
      { kind: "alf", length: 1, value: "" },
      { kind: "num", length: 12, value: this.onlyDigits(emp.conta) },
      { kind: "alf", length: 1, value: "" },
      { kind: "num", length: 1, value: this.onlyDigits(emp.dac) },
      { kind: "alf", length: 30, value: emp.nomeEmpresa },
      { kind: "alf", length: 30, value: finalidadeLote },
      { kind: "alf", length: 10, value: emp.historicoCc ?? "" },
      { kind: "alf", length: 30, value: emp.endereco ?? "" },
      { kind: "num", length: 5, value: this.onlyDigits(emp.numeroEndereco ?? "") },
      { kind: "alf", length: 15, value: emp.complementoEndereco ?? "" },
      { kind: "alf", length: 20, value: emp.cidade ?? "" },
      { kind: "num", length: 8, value: this.onlyDigits(emp.cep ?? "") },
      { kind: "alf", length: 2, value: emp.estado ?? "" },
      { kind: "alf", length: 8, value: "" },
      { kind: "alf", length: 10, value: "" },
    ]);
  }

  private generateSegmentoA(pag: PagamentoPixCnab, lote: number, registro: number): string {
    const dataPagamento = this.formatDate(pag.dataPagamento ?? new Date());
    const valorPagamento = this.toCentsInt(pag.valor);
    const numeroInscricaoFav = this.onlyDigits(pag.favorecidoNumeroInscricao);
    const moedaTipo = pag.moedaTipo ?? "009";
    const ispbFavorecido = this.formatCnabText((pag.ispbFavorecido ?? "").trim()).slice(0, 8);

    return this.buildRecord([
      { kind: "num", length: 3, value: ItauSispagPixService.CODIGO_BANCO },
      { kind: "num", length: 4, value: lote },
      { kind: "num", length: 1, value: "3" },
      { kind: "num", length: 5, value: registro },
      { kind: "alf", length: 1, value: "A" },
      { kind: "num", length: 3, value: ItauSispagPixService.TIPO_MOVIMENTO_INCLUSAO },
      { kind: "num", length: 3, value: ItauSispagPixService.CAMARA_SPI },
      { kind: "num", length: 3, value: "000" },
      { kind: "alf", length: 20, value: "" },
      { kind: "alf", length: 30, value: pag.favorecidoNome },
      { kind: "alf", length: 20, value: pag.nossoNumero ?? "" },
      { kind: "num", length: 8, value: dataPagamento },
      { kind: "alf", length: 3, value: moedaTipo, preserve: true },
      { kind: "alf", length: 8, value: ispbFavorecido, preserve: true },
      { kind: "alf", length: 2, value: ItauSispagPixService.IDENTIFICACAO_TRANSFERENCIA_PIX, preserve: true },
      { kind: "num", length: 5, value: "0" },
      { kind: "num", length: 15, value: valorPagamento },
      { kind: "alf", length: 15, value: "" },
      { kind: "alf", length: 5, value: "" },
      { kind: "num", length: 8, value: "0" },
      { kind: "num", length: 15, value: "0" },
      { kind: "alf", length: 20, value: pag.finalidadeDetalhe ?? "PIX TRANSFERENCIA" },
      { kind: "num", length: 6, value: "0" },
      { kind: "num", length: 14, value: numeroInscricaoFav },
      { kind: "alf", length: 2, value: "00", preserve: true },
      { kind: "alf", length: 5, value: "" },
      { kind: "alf", length: 5, value: "" },
      { kind: "alf", length: 1, value: pag.avisoFavorecido ?? "0", preserve: true },
      { kind: "alf", length: 10, value: "" },
    ]);
  }

  private generateSegmentoB(pag: PagamentoPixCnab, lote: number, registro: number): string {
    const pixInfo = this.processPixKeyStrict(pag.pixKey);
    const txid = this.formatTxid(pag.txid ?? "");
    const infoEntreUsuarios = this.zeroPad(
      this.onlyDigits(pag.informacoesEntreUsuariosNumericas ?? ""),
      65
    );

    return this.buildRecord([
      { kind: "num", length: 3, value: ItauSispagPixService.CODIGO_BANCO },
      { kind: "num", length: 4, value: lote },
      { kind: "num", length: 1, value: "3" },
      { kind: "num", length: 5, value: registro },
      { kind: "alf", length: 1, value: "B", preserve: true },
      { kind: "alf", length: 2, value: pixInfo.typeCode, preserve: true },
      { kind: "alf", length: 1, value: "" },
      { kind: "num", length: 1, value: pag.favorecidoTipoInscricao },
      { kind: "num", length: 14, value: this.onlyDigits(pag.favorecidoNumeroInscricao) },
      { kind: "alf", length: 30, value: txid, preserve: true },
      { kind: "num", length: 65, value: infoEntreUsuarios },
      { kind: "alf", length: 100, value: pixInfo.formattedKey, preserve: true },
      { kind: "alf", length: 3, value: "" },
      { kind: "alf", length: 10, value: "" },
    ]);
  }

  private generateTrailerLote(
    lote: number,
    qtdeRegistrosLote: number,
    somaValoresCents: number
  ): string {
    return this.buildRecord([
      { kind: "num", length: 3, value: ItauSispagPixService.CODIGO_BANCO },
      { kind: "num", length: 4, value: lote },
      { kind: "num", length: 1, value: "5" },
      { kind: "alf", length: 9, value: "" },
      { kind: "num", length: 6, value: qtdeRegistrosLote },
      { kind: "num", length: 18, value: somaValoresCents },
      { kind: "num", length: 18, value: "0" },
      { kind: "alf", length: 171, value: "" },
      { kind: "alf", length: 10, value: "" },
    ]);
  }

  private generateTrailerArquivo(
    qtdeLotesArquivo: number,
    qtdeRegistrosArquivo: number
  ): string {
    return this.buildRecord([
      { kind: "num", length: 3, value: ItauSispagPixService.CODIGO_BANCO },
      { kind: "num", length: 4, value: "9999" },
      { kind: "num", length: 1, value: "9" },
      { kind: "alf", length: 9, value: "" },
      { kind: "num", length: 6, value: qtdeLotesArquivo },
      { kind: "num", length: 6, value: qtdeRegistrosArquivo },
      { kind: "num", length: 6, value: "0" },
      { kind: "alf", length: 205, value: "" },
    ]);
  }

  private validateEmpresa(emp: EmpresaCnabInfo): void {
    this.assert(!!emp.nomeEmpresa, "nomeEmpresa é obrigatório.");
    this.assert(
      emp.tipoInscricao === "1" || emp.tipoInscricao === "2",
      "tipoInscricao da empresa deve ser '1' ou '2'."
    );

    const doc = this.onlyDigits(emp.numeroInscricao);
    if (emp.tipoInscricao === "1") {
      this.assert(doc.length === 11, "CPF da empresa deve ter 11 dígitos.");
    } else {
      this.assert(doc.length === 14, "CNPJ da empresa deve ter 14 dígitos.");
    }

    this.assert(this.onlyDigits(emp.agencia).length > 0, "agencia é obrigatória.");
    this.assert(this.onlyDigits(emp.conta).length > 0, "conta é obrigatória.");

    const dac = this.onlyDigits(emp.dac);
    this.assert(dac.length === 1, "dac deve ter exatamente 1 dígito.");

    if (emp.cep) {
      this.assert(this.onlyDigits(emp.cep).length <= 8, "cep deve ter no máximo 8 dígitos.");
    }

    if (emp.estado) {
      this.assert(
        this.formatCnabText(emp.estado).length <= 2,
        "estado deve ter no máximo 2 caracteres."
      );
    }
  }

  private validatePagamento(pag: PagamentoPixCnab): void {
    this.assert(!!pag.favorecidoNome, "favorecidoNome é obrigatório.");
    this.assert(
      pag.favorecidoTipoInscricao === "1" || pag.favorecidoTipoInscricao === "2",
      "favorecidoTipoInscricao deve ser '1' ou '2'."
    );

    const doc = this.onlyDigits(pag.favorecidoNumeroInscricao);
    if (pag.favorecidoTipoInscricao === "1") {
      this.assert(doc.length === 11, "CPF do favorecido deve ter 11 dígitos.");
    } else {
      this.assert(doc.length === 14, "CNPJ do favorecido deve ter 14 dígitos.");
    }

    this.assert(Number.isFinite(pag.valor) && pag.valor > 0, "valor deve ser maior que zero.");

    if (pag.txid) {
      this.assert(
        this.formatTxid(pag.txid).length <= 30,
        "txid deve ter no máximo 30 caracteres."
      );
    }

    if (pag.informacoesEntreUsuariosNumericas) {
      const digits = this.onlyDigits(pag.informacoesEntreUsuariosNumericas);
      this.assert(
        digits.length <= 65,
        "informacoesEntreUsuariosNumericas deve conter no máximo 65 dígitos."
      );
    }

    const pixInfo = this.processPixKeyStrict(pag.pixKey);

    if (pixInfo.typeCode === "03") {
      const keyDigits = this.onlyDigits(pixInfo.formattedKey);
      this.assert(
        keyDigits.length === 11 || keyDigits.length === 14,
        "Chave PIX tipo CPF/CNPJ deve ter 11 ou 14 dígitos."
      );
    }

    this.assert(
      this.formatCnabText(pag.favorecidoNome).length <= 30,
      "favorecidoNome deve ter no máximo 30 caracteres no CNAB."
    );

    this.assert(
      this.formatCnabText(pag.nossoNumero ?? "").length <= 20,
      "nossoNumero deve ter no máximo 20 caracteres."
    );

    this.assert(
      this.formatCnabText(pag.finalidadeDetalhe ?? "").length <= 20,
      "finalidadeDetalhe deve ter no máximo 20 caracteres."
    );

    if (pag.ispbFavorecido) {
      this.assert(
        this.formatCnabText(pag.ispbFavorecido).length <= 8,
        "ispbFavorecido deve ter no máximo 8 caracteres."
      );
    }
  }

  private processPixKeyStrict(rawKey: string): PixKeyInfo {
    const key = String(rawKey ?? "").trim();
    this.assert(!!key, "pixKey é obrigatória.");

    if (key.includes("@")) {
      this.assert(key.length <= 77, "E-mail PIX deve ter no máximo 77 caracteres.");
      this.assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key), "E-mail PIX inválido.");
      return { typeCode: "02", formattedKey: key };
    }

    if (
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key)
    ) {
      return { typeCode: "04", formattedKey: key.toLowerCase() };
    }

    const digits = this.onlyDigits(key);
    const onlyDigitsOrMask = /^[\d.\-\/()+\s]+$/.test(key);

    const looksLikePhone =
      key.startsWith("+55") ||
      (digits.startsWith("55") && (digits.length === 12 || digits.length === 13));

    if (looksLikePhone) {
      return {
        typeCode: "01",
        formattedKey: this.normalizeBrazilianPixPhone(key),
      };
    }

    if (onlyDigitsOrMask && digits.length === 11) {
      this.assert(this.isValidCpf(digits), "Chave PIX CPF inválida.");
      return { typeCode: "03", formattedKey: digits };
    }

    if (onlyDigitsOrMask && digits.length === 14) {
      return { typeCode: "03", formattedKey: digits };
    }

    throw new Error(
      "pixKey inválida. Use telefone com 55, e-mail, CPF/CNPJ ou chave aleatória UUID."
    );
  }

  private normalizeBrazilianPixPhone(raw: string): string {
    const value = String(raw ?? "").trim();
    this.assert(!!value, "Telefone PIX não informado.");

    if (value.startsWith("+")) {
      const normalized = `+${this.onlyDigits(value)}`;
      this.assert(
        /^\+55\d{10,11}$/.test(normalized),
        'Telefone PIX inválido. Use o padrão +55DDDNUMERO, ex.: "+5511999999999".'
      );
      return normalized;
    }

    const digits = this.onlyDigits(value);

    if (digits.startsWith("55")) {
      const normalized = `+${digits}`;
      this.assert(
        /^\+55\d{10,11}$/.test(normalized),
        'Telefone PIX inválido. Use o padrão com 55 + DDD + número, ex.: "5511999999999".'
      );
      return normalized;
    }

    throw new Error(
      'Telefone PIX inválido. Neste sistema ele deve vir com 55 na frente, ex.: "5511999999999".'
    );
  }

  private buildRecord(fields: RecordField[]): string {
    return fields
      .map((field) => {
        if (field.kind === "num") {
          return this.zeroPad(field.value ?? "", field.length);
        }

        const raw = String(field.value ?? "");
        const text = field.preserve ? raw : this.formatCnabText(raw);
        return this.spacePad(text, field.length);
      })
      .join("");
  }

  private formatCnabText(value: string): string {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ç/gi, "c")
      .replace(/[^\x20-\x7E]/g, "")
      .toUpperCase();
  }

  private formatTxid(value: string): string {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim()
      .slice(0, 30);
  }

  private onlyDigits(value: string): string {
    return String(value ?? "").replace(/\D/g, "");
  }

  private zeroPad(value: string | number, length: number): string {
    const str = String(value ?? "").replace(/\D/g, "");
    return str.slice(0, length).padStart(length, "0");
  }

  private spacePad(value: string, length: number): string {
    return String(value ?? "").slice(0, length).padEnd(length, " ");
  }

  private formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${dd}${mm}${yyyy}`;
  }

  private formatTime(date: Date): string {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}${mm}${ss}`;
  }

  private toCentsInt(value: number): number {
    return Math.round(value * 100);
  }

  private ensure240(line: string, lineNumber: number): string {
    if (line.length !== 240) {
      throw new Error(
        `Linha ${lineNumber} inválida: esperado 240 posições, recebido ${line.length}.`
      );
    }
    return line;
  }

  private isValidCpf(cpfToTest: string): boolean {
    const cpf = this.onlyDigits(cpfToTest);
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

  private assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
      throw new Error(message);
    }
  }
}