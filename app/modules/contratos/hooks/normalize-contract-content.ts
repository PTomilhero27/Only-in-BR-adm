/**
 * Normaliza o conteúdo do contrato garantindo que:
 * - todo bloco tenha `order`
 * - o `order` seja sequencial (1..n) conforme a ordem atual do array
 *
 * Motivo:
 * - evita quebra com dados legados e previne inconsistências ao reordenar/remover
 */
export function normalizeContractContent(raw: any) {
  const version =
    typeof raw?.version === "number" && Number.isInteger(raw.version) && raw.version >= 1
      ? raw.version
      : 1;

  const blocks = Array.isArray(raw?.blocks) ? raw.blocks : [];

  return {
    version,
    blocks: blocks.map((b: any, index: number) => ({
      ...b,
      order: index + 1,
    })),
  };
}

/**
 * Retorna o número "humano" da cláusula (1..n),
 * calculado apenas entre blocos do tipo "clause" (ignora freeText).
 */
function getClauseNumberById(content: any, clauseId: string) {
  const blocks = Array.isArray(content?.blocks) ? content.blocks : [];

  const clauses = blocks
    .filter((b: any) => b?.type === "clause")
    .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));

  const index = clauses.findIndex((c: any) => c?.id === clauseId);
  return index >= 0 ? index + 1 : 1;
}