"use client";

/**
 * Página do editor da vitrine de uma feira.
 *
 * Fluxo:
 * 1. Busca dados da feira (via useFairsQuery)
 * 2. Busca vitrine da feira (via useShowcaseByFairIdQuery)
 * 3. Feira não ATIVA → mostra alerta de bloqueio
 * 4. Sem vitrine → mostra CTA para criar
 * 5. Com vitrine → editor em seções verticais
 */

import { useMemo } from "react";
import { useParams } from "next/navigation";

import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Spinner } from "@/components/ui/spinner";

import { useFairsQuery } from "@/app/modules/fairs/hooks/use-fairs-query";
import { useShowcaseByFairIdQuery } from "@/app/modules/fair-showcase/showcase.queries";

import { ShowcaseBlockedAlert } from "./components/showcase-blocked-alert";
import { ShowcaseEmptyState } from "./components/showcase-empty-state";
import { ShowcaseHeader } from "./components/showcase-header";
import { ShowcaseGeneralForm } from "./components/showcase-general-form";
import { ShowcaseImagesSection } from "./components/showcase-images-section";
import { ShowcaseBenefitsEditor } from "./components/showcase-benefits-editor";
import { ShowcaseFaqEditor } from "./components/showcase-faq-editor";

export default function ShowcaseEditorPage() {
  const params = useParams<{ fairId: string }>();
  const fairId = useMemo(() => {
    const raw = params?.fairId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  // Busca a feira (para saber o nome e status)
  const { data: fairs = [] } = useFairsQuery();
  const fair = useMemo(
    () => fairs.find((f) => f.id === fairId) ?? null,
    [fairs, fairId],
  );

  // Busca a vitrine
  const {
    data: showcase,
    isLoading,
    isError,
  } = useShowcaseByFairIdQuery(fairId ?? "", Boolean(fairId));

  const isBlocked = fair ? fair.status !== "ATIVA" : false;

  if (!fairId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Feira não identificada.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
        {/* Breadcrumb */}
        <AppBreadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Vitrine Pública", href: "/vitrine" },
            { label: fair?.name ?? "Feira" },
          ]}
        />

        {/* Bloqueio para feira não ATIVA */}
        {isBlocked && <ShowcaseBlockedAlert fairStatus={fair?.status} />}

        {/* Erro ao buscar */}
        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">
              Erro ao carregar vitrine. Tente novamente.
            </p>
          </div>
        )}

        {/* Sem vitrine → CTA para criar */}
        {!isLoading && !isError && !showcase && !isBlocked && (
          <ShowcaseEmptyState fairId={fairId} fairName={fair?.name} />
        )}

        {/* Com vitrine → Editor */}
        {!isLoading && !isError && showcase && (
          <div className="space-y-6">
            <ShowcaseHeader
              fairId={fairId}
              showcase={showcase}
              fairName={fair?.name ?? "Feira"}
              disabled={isBlocked}
            />

            <ShowcaseGeneralForm
              fairId={fairId}
              showcase={showcase}
              disabled={isBlocked}
            />

            <ShowcaseImagesSection
              fairId={fairId}
              showcase={showcase}
              disabled={isBlocked}
            />

            <ShowcaseBenefitsEditor
              fairId={fairId}
              showcase={showcase}
              disabled={isBlocked}
            />

            <ShowcaseFaqEditor
              fairId={fairId}
              showcase={showcase}
              disabled={isBlocked}
            />
          </div>
        )}
      </div>
    </div>
  );
}
