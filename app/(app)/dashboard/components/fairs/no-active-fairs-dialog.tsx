"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Modal exibido quando o usuário clica no bloco "Feiras"
 * e não existe nenhuma feira ativa.
 *
 * Responsabilidade:
 * - Informar que não há feiras ativas.
 * - Oferecer CTA para cadastrar nova feira.
 */
export function NoActiveFairsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, onOpenChange } = props;
  const router = useRouter();

  function handleCreateFair() {
    onOpenChange(false);

    /**
     * Sugestão de rota:
     * - Podemos ter /config/feiras (lista + botão criar)
     * - ou /config/feiras/nova (form direto)
     *
     * Ajuste conforme você definir o módulo de Configurações.
     */
    router.push("/config");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nenhuma feira ativa</DialogTitle>
          <DialogDescription>
            Para começar a gestão, cadastre uma nova feira.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleCreateFair}>Cadastrar nova feira</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
