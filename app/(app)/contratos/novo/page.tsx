/**
 * /contratos/novo
 * Responsabilidade: iniciar o fluxo de criação.
 *
 * Decisão:
 * - Esta página abre o modal de título automaticamente.
 * - Ao salvar, cria o template e redireciona para /contratos/:id (editor).
 */

import { NewContractPage } from "./components/new-contract-page";

export default function Page() {
  return <NewContractPage />;
}
