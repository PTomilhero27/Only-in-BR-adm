"use client";

/**
 * Modal de escolha quando a cláusula já possui incisos.
 *
 * Responsabilidade:
 * - Evitar UX confusa: "Editar" pode significar editar o título da cláusula ou os incisos.
 * - Se existem incisos, força o usuário a escolher.
 */

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  onEditClause: () => void;
  onEditIncisos: () => void;
}

export function EditClauseOrIncisosDialog({
  open,
  onOpenChange,
  onEditClause,
  onEditIncisos,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle>O que você quer editar?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Esta cláusula já possui incisos. Escolha o que deseja editar.
          </p>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={onEditClause}
          >
            Editar cláusula
          </Button>

          <Button
            variant="outline"
            className="justify-start"
            onClick={onEditIncisos}
          >
            Editar incisos
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
