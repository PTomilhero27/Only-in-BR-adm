/**
 * Estado vazio da listagem.
 * Responsabilidade: orientar o usuário e oferecer CTA.
 */
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="p-8">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="rounded-full border p-3 text-muted-foreground">
          <FileText className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-lg font-semibold">Nenhum contrato criado ainda</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Crie um template de contrato para padronizar a geração e assinatura dos expositores.
          Você poderá adicionar cláusulas, incisos, texto livre e ativar a ficha cadastral.
        </p>

        <Button onClick={onCreate} className="mt-5 gap-2">
          <Plus className="h-4 w-4" />
          Criar primeiro contrato
        </Button>
      </div>
    </Card>
  );
}
