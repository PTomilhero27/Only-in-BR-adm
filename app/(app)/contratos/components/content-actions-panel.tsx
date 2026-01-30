"use client";

/**
 * Painel de ações de conteúdo.
 * Responsabilidade:
 * - Ativar/desativar ficha cadastral
 * - Botões para adicionar cláusula e texto livre
 *
 * Observação:
 * - Por enquanto ações já alteram o content local.
 * - Na próxima etapa, cláusula/inciso/texto livre terão modais e rich text.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, UserSquare2, TextQuote } from "lucide-react";

export function ContentActionsPanel(props: {
  disabled: boolean;
  hasRegistration: boolean;
  onToggleRegistration: (next: boolean) => Promise<void>;

  onAddClause: () => void;
  onAddFreeText: () => void;
}) {
  const { disabled, hasRegistration, onToggleRegistration, onAddClause, onAddFreeText } = props;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium">Conteúdo do contrato</div>
          <div className="text-xs text-muted-foreground">
            Monte o documento por blocos: ficha cadastral, cláusulas e textos livres.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <UserSquare2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Ficha cadastral</span>
            <Switch
              checked={hasRegistration}
              onCheckedChange={(v) => onToggleRegistration(Boolean(v))}
              disabled={disabled}
            />
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={onAddClause}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
            Adicionar cláusula
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={onAddFreeText}
            disabled={disabled}
          >
            <TextQuote className="h-4 w-4" />
            Texto livre
          </Button>
        </div>
      </div>
    </Card>
  );
}
