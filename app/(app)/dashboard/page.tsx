import { Settings, Users, Wallet, FileText } from "lucide-react";
import { DashboardTile } from "./components/dashboard-tile";
import { FairsDashboardTile } from "./components/fairs/fairs-dashboard-tile";

export default function DashboardPage() {
  return (
    <div className="space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Atalhos rápidos para as áreas principais do painel.
        </p>
      </header>

      <div className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">

        {/* 1) Feiras */}
        <FairsDashboardTile />

        {/* 2) Contratos */}
        <DashboardTile
          title="Contratos"
          description="Templates e documentos por feira"
          href="/contratos"
          icon={<FileText className="h-5 w-5" />}
          accentClassName="bg-sky-500"
        >
          <p className="text-xs text-muted-foreground">
            Criação e gestão de contratos e aditivos.
          </p>
        </DashboardTile>

        {/* 3) Interessados */}
        <DashboardTile
          title="Interessados"
          description="Cadastros para futuras feiras"
          href="/interessados"
          icon={<Users className="h-5 w-5" />}
          accentClassName="bg-emerald-500"
        >
          <p className="text-xs text-muted-foreground">
            Lista e acompanhamento de contatos.
          </p>
        </DashboardTile>

        {/* 4) Financeiro */}
        <DashboardTile
          title="Financeiro"
          description="Visão por feira e consolidada"
          href="/financeiro"
          icon={<Wallet className="h-5 w-5" />}
          accentClassName="bg-amber-500"
        >
          <p className="text-xs text-muted-foreground">
            Pendências, recebidos e vencidos.
          </p>
        </DashboardTile>

        {/* 5) Configurações */}
        <DashboardTile
          title="Configurações"
          description="Administração do sistema"
          href="/config"
          icon={<Settings className="h-5 w-5" />}
          accentClassName="bg-violet-500"
        >
          <p className="text-xs text-muted-foreground">
            Feiras, formulários, usuários e permissões.
          </p>
        </DashboardTile>

      </div>
    </div>
  );
}
