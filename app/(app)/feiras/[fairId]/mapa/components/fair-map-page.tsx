"use client";

import { useFairMapQuery } from "@/app/modules/fair-maps/fair-maps.queries";
import { FairMapTemplatesPanel } from "./fair-map-templates-panel";
import { ApiError } from "@/app/shared/http/errors";

/**
 * FairMapPage
 *
 * Responsabilidade:
 * - Carregar o mapa atual da feira (se existir)
 * - Sempre renderizar o painel de templates (para aplicar/trocar)
 *
 * Regra:
 * - 404 do GET /fairs/:fairId/map NÃO é erro de UI, é "não configurado".
 */
export function FairMapPage({ fairId }: { fairId: string }) {
  const fairMap = useFairMapQuery(fairId);

  const notConfigured =
    fairMap.error instanceof ApiError && fairMap.error.status === 404;

  return (
    <FairMapTemplatesPanel
      fairId={fairId}
      fairMap={notConfigured ? null : fairMap.data ?? null}
      fairMapLoading={fairMap.isLoading}
      fairMapError={!notConfigured ? (fairMap.error as any) : null}
    />
  );
}