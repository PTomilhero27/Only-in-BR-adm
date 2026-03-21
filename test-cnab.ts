import { ItauSispagPixService, EmpresaCnabInfo, PagamentoPixCnab } from "./app/modules/financeiro/cnab/itau-sispag-pix.service";

const emp: EmpresaCnabInfo = {
  nomeEmpresa: "TEST",
  tipoInscricao: "2",
  numeroInscricao: "12345678000199",
  agencia: "1234",
  conta: "12345",
  dac: "6",
};

const pags: PagamentoPixCnab[] = [
  {
    favorecidoNome: "ANGATU ATELIE",
    pixKey: "12345678909",
    valorOriginal: 100.50,
  }
];

const service = new ItauSispagPixService();
try {
  const result = service.generateFile(emp, pags);
  const lines = result.split("\r\n");
  for (let i = 0; i < lines.length; i++) {
    console.log(`Line ${i + 1}: length = ${lines[i].length}`);
    if (lines[i].length !== 240) {
      console.error(`ERROR on Line ${i + 1}: expected 240, got ${lines[i].length}`);
    }
  }
} catch (e) {
  console.error(e);
}
