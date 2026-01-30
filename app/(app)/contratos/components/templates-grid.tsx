/**
 * Grid de cards de templates.
 * Responsabilidade: layout de listagem.
 */
import { DocumentTemplateSummary } from "@/app/modules/contratos/document-templates/document-templates.schema";
import { TemplateCard } from "./template-card";

export function TemplatesGrid({ templates }: { templates: DocumentTemplateSummary[] }) {
  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} />
      ))}
    </div>
  );
}



