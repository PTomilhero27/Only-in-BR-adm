"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { FairDashboardCards } from "./components/fair-dashboard-cards";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";

/**
 * Esta página é responsável por exibir o "dashboard" de uma feira específica.
 * Ela serve como hub (atalhos) para as áreas internas da feira: fornecedores,
 * barracas, financeiro, etc.
 *
 * Observação:
 * - Neste primeiro passo, o foco é resolver o 404 e estruturar a navegação.
 * - Depois conectamos com o backend para carregar os dados reais da feira.
 */
export default function FairDashboardPage() {
    const params = useParams<{ fairId: string }>();

    // Normalizamos por garantia (useParams pode retornar string | string[])
    const fairId = useMemo(() => {
        const raw = params?.fairId;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);

    if (!fairId) {
        return (
            <div className="p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Feira não identificada</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Não foi possível ler o parâmetro <code>fairId</code> na URL.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Cabeçalho da área da feira */}
            <div className="space-y-2">
                <AppBreadcrumb
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Feira" },
                    ]}
                />
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Dashboard da feira</h1>
                        <p className="text-sm text-muted-foreground">
                            Acessos rápidos para as áreas desta feira.
                        </p>
                    </div>



                </div>

                <Separator />
            </div>

            {/* Cards de atalhos (estilo dashboard principal) */}
            <FairDashboardCards fairId={fairId} />


        </div>
    );
}
