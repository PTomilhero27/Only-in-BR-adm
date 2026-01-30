"use client";

import { DocumentTemplate } from "@/app/modules/contratos/document-templates/document-templates.schema";
/**
 * Preview (placeholder).
 * Responsabilidade:
 * - Mostrar como o contrato está ficando.
 *
 * Próximos passos:
 * - Renderizar rich text formatado.
 * - Aplicar layout “cara de contrato” (tipografia, margens, etc).
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PreviewDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate | null;
}) {
  const { open, onOpenChange, template } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview do contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm font-medium">{template?.title ?? "—"}</div>

          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Preview ainda simples (placeholder). Na próxima etapa vamos renderizar:
            <ul className="ml-5 mt-2 list-disc">
              <li>ficha cadastral (se habilitada)</li>
              <li>cláusulas e incisos numerados</li>
              <li>texto livre com negrito/itálico/listas</li>
            </ul>
          </div>

          <pre className="max-h-[360px] overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(template?.content ?? {}, null, 2)}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
