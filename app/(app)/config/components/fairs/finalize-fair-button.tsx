"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinalizeFairMutation } from "@/app/modules/fairs/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function FinalizeFairButton({ fairId }: { fairId: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useFinalizeFairMutation();

  const handleFinalize = async () => {
    try {
      await mutation.mutateAsync(fairId);
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar a feira.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-slate-700 hover:bg-slate-100">
          <CheckCircle2 className="h-4 w-4" />
          Finalizar Feira
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Atenção: Finalizar Feira
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja finalizar esta feira? <br />
            <strong>Esta ação é irreversível.</strong> Após a finalização, nenhuma nova
            reserva, contrato, pagamento ou edição poderá ser feita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleFinalize();
            }}
            disabled={mutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {mutation.isPending ? "Finalizando..." : "Sim, finalizar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
