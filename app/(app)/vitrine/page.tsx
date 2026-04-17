"use client";

/**
 * Página de listagem das vitrines (Vitrine Pública).
 *
 * Responsabilidade:
 * - Listar todas as feiras ATIVAS
 * - Mostrar status de cada vitrine (Publicada / Rascunho / Sem vitrine)
 * - Permitir navegar para o editor da vitrine de cada feira
 *
 * Decisão:
 * - Feiras não-ATIVAS não aparecem aqui (bloqueio total).
 * - Cruzamos feiras ativas com vitrines existentes via dois queries separados.
 */

import { useMemo } from "react";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Megaphone } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query";
import { useListShowcasesQuery } from "@/app/modules/fair-showcase/showcase.queries";
import { ShowcaseFairCard } from "./components/showcase-fair-card";

export default function VitrinePage() {
  const {
    data: activeFairs = [],
    isLoading: fairsLoading,
    isError: fairsError,
  } = useFairsQuery({ status: "ATIVA" });

  const {
    data: showcases = [],
    isLoading: showcasesLoading,
  } = useListShowcasesQuery();

  const isLoading = fairsLoading || showcasesLoading;

  /**
   * Para cada feira ativa, encontrar se existe vitrine vinculada.
   */
  const fairsWithStatus = useMemo(() => {
    return activeFairs.map((fair) => {
      const showcase = showcases.find((s) => s.fairId === fair.id);
      return {
        fair,
        showcase: showcase ?? null,
        showcaseStatus: showcase
          ? showcase.isPublished
            ? ("published" as const)
            : ("draft" as const)
          : ("none" as const),
      };
    });
  }, [activeFairs, showcases]);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        {/* Header */}
        <header className="space-y-2">
          <AppBreadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Vitrine Pública" },
            ]}
          />

          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-pink-500/10 p-2.5">
              <Megaphone className="h-6 w-6 text-pink-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Vitrine Pública
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie o conteúdo público de cada feira ativa. Somente feiras
                ativas podem ter vitrine configurável.
              </p>
            </div>
          </div>
        </header>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {fairsError && !isLoading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">
              Erro ao carregar feiras. Tente novamente.
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !fairsError && fairsWithStatus.length === 0 && (
          <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-12 text-center">
            <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-medium text-muted-foreground">
              Nenhuma feira ativa
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Crie ou ative uma feira para configurar sua vitrine pública.
            </p>
          </div>
        )}

        {/* Grid de feiras */}
        {!isLoading && fairsWithStatus.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fairsWithStatus.map(({ fair, showcase, showcaseStatus }) => (
              <ShowcaseFairCard
                key={fair.id}
                fair={fair}
                showcase={showcase}
                showcaseStatus={showcaseStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
