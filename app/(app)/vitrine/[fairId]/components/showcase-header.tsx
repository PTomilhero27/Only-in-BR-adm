"use client";

/**
 * Header da vitrine com:
 * - Nome da feira
 * - Badge de status (Publicada / Rascunho)
 * - Botões: Publicar/Despublicar, Deletar
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileEdit,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import {
  usePublishShowcaseMutation,
  useUnpublishShowcaseMutation,
  useRemoveShowcaseMutation,
} from "@/app/modules/fair-showcase/showcase.queries";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import type { Showcase } from "@/app/modules/fair-showcase/showcase.schema";

export function ShowcaseHeader({
  fairId,
  showcase,
  fairName,
  disabled = false,
}: {
  fairId: string;
  showcase: Showcase;
  fairName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const publishMutation = usePublishShowcaseMutation(fairId);
  const unpublishMutation = useUnpublishShowcaseMutation(fairId);
  const removeMutation = useRemoveShowcaseMutation(fairId);

  function handlePublish() {
    publishMutation.mutate(undefined, {
      onSuccess: () =>
        toast.success({ title: "Vitrine publicada!", subtitle: "Agora está visível no portal." }),
      onError: (err) =>
        toast.error({ title: "Erro", subtitle: getErrorMessage(err) }),
    });
  }

  function handleUnpublish() {
    unpublishMutation.mutate(undefined, {
      onSuccess: () =>
        toast.success({ title: "Vitrine despublicada", subtitle: "Não está mais visível." }),
      onError: (err) =>
        toast.error({ title: "Erro", subtitle: getErrorMessage(err) }),
    });
  }

  function handleDelete() {
    removeMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success({ title: "Vitrine removida" });
        setConfirmDeleteOpen(false);
      },
      onError: (err) =>
        toast.error({ title: "Erro", subtitle: getErrorMessage(err) }),
    });
  }

  const isPublished = showcase.isPublished;
  const isActioning =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    removeMutation.isPending;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Info */}
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{fairName}</h1>
          <div className="flex items-center gap-2">
            {isPublished ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Publicada
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                <FileEdit className="mr-1 h-3 w-3" />
                Rascunho
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {/* Publicar / Despublicar */}
        {isPublished ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnpublish}
            disabled={disabled || isActioning}
          >
            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
            Despublicar
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={disabled || isActioning}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Publicar
          </Button>
        )}

        {/* Deletar */}
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || isActioning}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Deletar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover vitrine?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação é irreversível. Todo o conteúdo (textos, imagens,
                benefícios, FAQ) será permanentemente removido.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeMutation.isPending ? "Removendo…" : "Sim, remover"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
