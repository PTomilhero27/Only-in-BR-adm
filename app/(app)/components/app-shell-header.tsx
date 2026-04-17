"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LayoutGrid, LogOut, Settings2 } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sectionLabels: Record<string, string> = {
  dashboard: "Dashboard",
  vitrine: "Vitrine",
  interessados: "Interessados",
  excel: "Relatorios",
  contratos: "Contratos",
  financeiro: "Financeiro",
  config: "Configuracoes",
  feiras: "Feiras",
};

function getSectionLabel(pathname: string) {
  const [, firstSegment] = pathname.split("/");
  return sectionLabels[firstSegment] ?? "Painel";
}

function getInitials(name?: string | null) {
  if (!name) return "OI";
  const [first = "", second = ""] = name.trim().split(/\s+/);
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

export function AppShellHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const sectionLabel = useMemo(() => getSectionLabel(pathname), [pathname]);
  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="font-display inline-flex items-center gap-2 rounded-md border border-primary/10 bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:brightness-110"
          >
            <LayoutGrid className="h-4 w-4" />
            Painel
          </Link>

          <span className="hidden text-primary/25 sm:inline">/</span>

          <span className="font-display hidden rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary/80 sm:inline-flex">
            {sectionLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex items-center gap-3 rounded-md border border-border bg-white px-2 py-1.5 transition hover:bg-muted sm:px-3"
              >
                <div className="font-display flex size-8 items-center justify-center rounded-md bg-primary text-[11px] text-primary-foreground">
                  {initials}
                </div>

                <div className="hidden min-w-0 text-left sm:block">
                  <div className="truncate text-sm text-primary">
                    {user?.name ?? "Usuario"}
                  </div>
                  <div className="truncate text-xs text-primary/60">
                    {user?.email ?? "Sessao ativa"}
                  </div>
                </div>

                <div className="flex size-7 items-center justify-center rounded-md bg-muted text-primary/45 transition group-hover:text-primary">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 rounded-lg border-border/80 p-2">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="font-display text-sm text-primary">
                  {user?.name ?? "Usuario"}
                </div>
                <div className="mt-0.5 text-xs font-normal text-primary/60">
                  {user?.email ?? "Sessao ativa"}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => router.push("/config")}
                className={cn(
                  "rounded-md px-3 py-2.5",
                  pathname.startsWith("/config") && "bg-secondary"
                )}
              >
                <Settings2 className="h-4 w-4" />
                Configuracoes
              </DropdownMenuItem>

              <DropdownMenuItem
                variant="destructive"
                onSelect={handleLogout}
                className="rounded-md px-3 py-2.5"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
