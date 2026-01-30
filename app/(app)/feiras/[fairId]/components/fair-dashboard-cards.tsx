import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Este componente centraliza os cards (atalhos) do dashboard da feira.
 * A ideia é manter o page.tsx enxuto e permitir evoluir os cards com facilidade
 * (adicionando contadores, badges, permissões por role, etc.).
 */
export function FairDashboardCards({ fairId }: { fairId: string }) {
    const items = [
        {
            title: "Barracas vinculadas",
            description: "Visualize e gerencie barracas participantes",
            href: `/feiras/${fairId}/barracas`,
            accentClass: "border-l-4 border-l-green-500",
        },
        {
            title: "Fornecedores",
            description: "Cadastro e vínculo de fornecedores desta feira",
            href: `/feiras/${fairId}/fornecedores`,
            accentClass: "border-l-4 border-l-blue-500",
        },

        {
            title: "Financeiro",
            description: "Recebíveis, pendências e consolidado da feira",
            href: `/feiras/${fairId}/financeiro`,
            accentClass: "border-l-4 border-l-orange-500",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                    <Card className={`transition hover:shadow-md ${item.accentClass}`}>
                        <CardHeader>
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            <CardDescription>{item.description}</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
