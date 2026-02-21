"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useFairMapQuery } from "@/app/modules/fair-maps/fair-maps.queries";
import { MapaClient } from "./mapa-client";

export function EditorClient({ fairId }: { fairId: string }) {
  const router = useRouter();
  const fairMap = useFairMapQuery(fairId);

  // 404 do backend = "não tem mapa vinculado"
  const isNotConfigured =
    (fairMap.error as any)?.statusCode === 404 ||
    (fairMap.error as any)?.status === 404;

  return (
    <div className="p-6 space-y-4">


      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="h-6 w-px bg-border" />

          <div>
            <div className="text-lg font-semibold">Editor do mapa</div>
            <div className="text-sm text-muted-foreground">
              Edite o mapa desta feira (vínculos/slots).
            </div>
          </div>
        </div>
      </div>

      {fairMap.isLoading ? (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">
          Carregando mapa…
        </div>
      ) : fairMap.error ? (
        isNotConfigured ? (
          <div className="rounded-2xl border bg-background p-10 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <MapIcon className="h-7 w-7 text-muted-foreground" />
            </div>

            <div className="text-lg font-semibold">Mapa não configurado</div>

            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Esta feira ainda não possui uma planta aplicada. Volte para a tela
              anterior para escolher/aplicar uma planta.
            </p>

            <div className="pt-2">
              <Button onClick={() => router.push(`/feiras/${fairId}/mapa`)}>
                Ir para plantas
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border p-6 text-sm text-destructive">
            Erro ao carregar mapa.
          </div>
        )
      ) : (
        // ✅ O MapaClient já busca o mapa por fairId.
        <MapaClient fairId={fairId} />
      )}
    </div>
  );
}