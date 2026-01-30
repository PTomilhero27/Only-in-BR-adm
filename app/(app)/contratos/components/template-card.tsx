"use client";

/**
 * Card bonito do template.
 * Responsabilidade:
 * - Exibir metadados essenciais.
 * - Navegar para /contratos/:id ao clicar.
 *
 * Observação:
 * - Evitamos “cara de site institucional” usando card compacto, hover sutil e badges discretos.
 */
import { useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { documentTemplateStatusLabel, DocumentTemplateSummary, documentTemplateTypeLabel } from "@/app/modules/contratos/document-templates/document-templates.schema";



function statusVariant(status: DocumentTemplateSummary["status"]) {
  // Opcional: mapear para variants do shadcn (default/secondary/destructive/outline)
  if (status === "PUBLISHED") return "default";
  if (status === "ARCHIVED") return "secondary";
  return "outline"; // DRAFT
}

export function TemplateCard({ template }: { template: DocumentTemplateSummary }) {
  const router = useRouter();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/contratos/${template.id}`)}
      className="group cursor-pointer space-y-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md border p-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>

          <div className="space-y-1">
            <div className="line-clamp-2 text-sm font-medium leading-snug">
              {template.title}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(template.status)}>
                {documentTemplateStatusLabel(template.status)}
              </Badge>

              {template.isAddendum && (
                <Badge variant="secondary">
                  {documentTemplateTypeLabel(template.isAddendum)}
                </Badge>
              )}

              {template.hasRegistration && (
                <Badge variant="outline">Ficha cadastral</Badge>
              )}
            </div>
          </div>
        </div>

        <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Vinculado em{" "}
          <span className="font-medium text-foreground">
            {template.usage.fairsCount}
          </span>{" "}
          feira(s)
        </span>

        <span className="opacity-70">
          Atualizado: {new Date(template.updatedAt).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </Card>
  );
}
