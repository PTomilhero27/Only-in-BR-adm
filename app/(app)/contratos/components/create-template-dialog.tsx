"use client";

/**
 * Modal de criação rápida (apenas título).
 * Responsabilidade:
 * - Capturar título e disparar criação via callback.
 *
 * Observação:
 * - Depois de criar, a tela navega para /contratos/:id (edição).
 */
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  titleValue: string;
  onTitleChange: (value: string) => void;

  canSave: boolean;
  isSaving: boolean;

  onSave: () => void;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  titleValue,
  onTitleChange,
  canSave,
  isSaving,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Título do contrato</label>
          <Input
            placeholder="Ex.: Contrato de Exposição de Produtos"
            value={titleValue}
            onChange={(e) => onTitleChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Depois você poderá adicionar cláusulas, incisos, texto livre e publicar.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>

          <Button onClick={onSave} disabled={!canSave || isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
