"use client";

import {
  FileSpreadsheet,
  FileText,
  Megaphone,
  Users,
  Wallet,
} from "lucide-react";

import { DashboardTile } from "./components/dashboard-tile";
import { FairsDashboardTile } from "./components/fairs/fairs-dashboard-tile";

const dashboardModules = [
  {
    title: "Vitrine",
    description: "Conteudo publico, beneficios, FAQ e imagens das feiras.",
    href: "/vitrine",
    eyebrow: "Marketing",
    icon: <Megaphone className="h-5 w-5" />,
    accentClassName: "bg-secondary",
    footer: "Editar vitrine",
    tags: ["Conteudo", "Midia"],
  },
  {
    title: "Interessados",
    description: "Cadastros comerciais para acompanhar leads.",
    href: "/interessados",
    eyebrow: "Relacionamento",
    icon: <Users className="h-5 w-5" />,
    accentClassName: "bg-brand-green",
    footer: "Acompanhar contatos",
    tags: ["Leads", "Historico"],
  },
  {
    title: "Relatorios",
    description: "Planilhas, exportacoes e templates de apoio operacional.",
    href: "/excel",
    eyebrow: "Operacao",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    accentClassName: "bg-accent",
    footer: "Abrir relatorios",
    tags: ["Excel", "Exportacao"],
  },
  {
    title: "Contratos",
    description: "Templates, clausulas e documentos por feira.",
    href: "/contratos",
    eyebrow: "Documentos",
    icon: <FileText className="h-5 w-5" />,
    accentClassName: "bg-primary",
    footer: "Gerenciar contratos",
    tags: ["Templates", "Aditivos"],
  },
  {
    title: "Financeiro",
    description: "Recebimentos, pendencias e visao consolidada por feira.",
    href: "/financeiro",
    eyebrow: "Receita",
    icon: <Wallet className="h-5 w-5" />,
    accentClassName: "bg-brand-green",
    footer: "Abrir financeiro",
    tags: ["Pendencias", "Pagamentos"],
  },
];

export default function DashboardPage() {
  return (
    <div className="bg-white px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FairsDashboardTile />

          {dashboardModules.map((module) => (
            <DashboardTile
              key={module.title}
              title={module.title}
              description={module.description}
              href={module.href}
              eyebrow={module.eyebrow}
              icon={module.icon}
              accentClassName={module.accentClassName}
              footer={module.footer}
            >
              <div className="flex flex-wrap gap-2">
                {module.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-primary/72"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </DashboardTile>
          ))}
        </div>
      </div>
    </div>
  );
}
