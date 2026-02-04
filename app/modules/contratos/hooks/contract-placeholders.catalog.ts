/**
 * contract-placeholders.catalog.ts
 *
 * Responsabilidade:
 * - Centralizar TODOS os placeholders disponíveis para templates de contrato.
 *
 * Decisão:
 * - Este catálogo é o "contrato" entre editor e renderer.
 * - Evita duplicação e garante que a UI de sugestões e o render usem os mesmos códigos.
 */

export type ContractPlaceholderItem = {
  /**
   * Chave interna usada no template.
   * Ex.: {{EXHIBITOR_NAME}}
   */
  key: string

  /**
   * Rótulo amigável exibido no menu de sugestões
   */
  label: string

  /**
   * Ajuda curta para o usuário entender onde será preenchido
   */
  description?: string

  /**
   * Categoria opcional para organizar a lista
   */
  group?: "Expositor" | "Feira" | "Contrato"
}

export const CONTRACT_PLACEHOLDERS: ContractPlaceholderItem[] = [
  {
    key: "EXHIBITOR_NAME",
    label: "Nome do expositor",
    description: "Nome/Razão Social do expositor",
    group: "Expositor",
  },
  {
    key: "EXHIBITOR_DOCUMENT",
    label: "CPF/CNPJ do expositor",
    description: "Documento do expositor (CPF ou CNPJ)",
    group: "Expositor",
  },
  {
    key: "EXHIBITOR_EMAIL",
    label: "E-mail do expositor",
    group: "Expositor",
  },
  {
    key: "EXHIBITOR_PHONE",
    label: "Telefone do expositor",
    group: "Expositor",
  },
  {
    key: "FAIR_NAME",
    label: "Nome da feira",
    group: "Feira",
  },
  {
    key: "FAIR_CITY",
    label: "Cidade da feira",
    group: "Feira",
  },
  {
    key: "CONTRACT_DATE",
    label: "Data do contrato",
    description: "Data de geração/assinatura",
    group: "Contrato",
  },
]
