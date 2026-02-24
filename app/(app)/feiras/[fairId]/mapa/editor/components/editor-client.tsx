"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { MapaClient } from "./mapa-client";

export function EditorClient({ fairId }: { fairId: string }) {
  const router = useRouter();


  return (
    <div className="space-y-4 p-6">
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

      {/* ✅ MapaClient cuida de loading/404/error e já tem os logs */}
      <MapaClient fairId={fairId} />
    </div>
  );
}