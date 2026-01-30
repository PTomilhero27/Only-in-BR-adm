/**
 * /contratos/[templateId]
 *
 * Responsabilidade:
 * - Extrair templateId da rota (server component)
 * - Renderizar o componente client que faz fetch/edição.
 *
 * Observação:
 * - Em versões recentes do Next, "params" pode ser Promise.
 *   Por isso tornamos o componente async e fazemos await.
 */
import { ContractTemplatePage } from "./components/contract-template-page";

export default async function Page(props: {
  params: Promise<{ templateId: string }> | { templateId: string };
}) {
  const params = await props.params;
  return <ContractTemplatePage templateId={params.templateId} />;
}
