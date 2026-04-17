"use client";

/**
 * Estado vazio quando a feira ainda não tem vitrine.
 * CTA para criar a vitrine com apenas um clique.
 */

import { Megaphone, PlusCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateShowcaseMutation } from "@/app/modules/fair-showcase/showcase.queries";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";

export function ShowcaseEmptyState({
  fairId,
  fairName,
}: {
  fairId: string;
  fairName?: string | null;
}) {
  const createMutation = useCreateShowcaseMutation(fairId);

  function handleCreate() {
    createMutation.mutate(
      {},
      {
        onSuccess: () => {
          toast.success({
            title: "Vitrine criada!",
            subtitle: "Agora configure o conteúdo da vitrine.",
          });
        },
        onError: (err) => {
          toast.error({
            title: "Erro ao criar vitrine",
            subtitle: getErrorMessage(err),
          });
        },
      },
    );
  }

  return (
    <Card className="relative overflow-hidden border-dashed border-muted-foreground/20">
      {/* Gradient decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-orange-500/5" />

      <CardContent className="relative flex flex-col items-center py-16 text-center">
        <div className="relative">
          <div className="rounded-2xl border border-pink-500/20 bg-pink-500/10 p-4">
            <Megaphone className="h-10 w-10 text-pink-500" />
          </div>
          <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-amber-400" />
        </div>

        <h3 className="mt-6 text-xl font-semibold">
          {fairName ? `Vitrine de "${fairName}"` : "Vitrine da Feira"}
        </h3>

        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Esta feira ainda não possui uma vitrine pública. Crie agora para
          configurar informações, imagens, benefícios e FAQ que os expositores
          verão.
        </p>

        <Button
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="mt-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:from-pink-600 hover:to-rose-600"
          size="lg"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {createMutation.isPending ? "Criando…" : "Criar Vitrine"}
        </Button>
      </CardContent>
    </Card>
  );
}
