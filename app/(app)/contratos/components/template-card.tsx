"use client";

/**
 * Card bonito do template.
 * Responsabilidade:
 * - Exibir metadados essenciais.
 * - Navegar para /contratos/:id ao clicar.
 * - Botão "Duplicar" para criar cópia do template.
 *
 * Observação:
 * - Evitamos "cara de site institucional" usando card compacto, hover sutil e badges discretos.
 */
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Copy, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentTemplateStatusLabel, DocumentTemplateSummary, documentTemplateTypeLabel } from "@/app/modules/contratos/document-templates/document-templates.schema";
import { useDuplicateDocumentTemplateMutation } from "@/app/modules/contratos/document-templates/document-templates.queries";
import { toast } from "@/components/ui/toast";



function statusVariant(status: DocumentTemplateSummary["status"]) {
  // Opcional: mapear para variants do shadcn (default/secondary/destructive/outline)
  if (status === "PUBLISHED") return "default";
  if (status === "ARCHIVED") return "secondary";
  return "outline"; // DRAFT
}

export function TemplateCard({ template }: { template: DocumentTemplateSummary }) {
  const router = useRouter();
  const duplicateMutation = useDuplicateDocumentTemplateMutation();

  function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    duplicateMutation.mutate(
      { id: template.id },
      {
        onSuccess: (created) => {
          toast.success({ title: `Template "${created.title}" duplicado com sucesso!` });
          router.push(`/contratos/${created.id}`);
        },
        onError: (err: any) => {
          toast.error(err?.message || "Não foi possível duplicar o template.");
        },
      },
    );
  }

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

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
            title="Duplicar template"
          >
            {duplicateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
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
