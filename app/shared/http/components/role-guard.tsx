"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * RoleGuard (genérico)
 *
 * Responsabilidade:
 * - Proteger uma área da UI com base em autenticação + roles permitidas
 * - Reutilizável em qualquer lugar do sistema
 *
 * Comportamento:
 * - Se não estiver autenticado: redireciona para /login
 * - Se estiver autenticado mas sem permissão: mostra fallback amigável
 *
 * Observação:
 * - `allowedRoles` é opcional:
 *   - se não passar, ele só garante que está autenticado
 *   - se passar, exige role dentro da lista
 */
type RoleGuardProps = {
  children: ReactNode;
  allowedRoles?: string[]; // ex.: ['ADMIN', 'FINANCE']
  redirectTo?: string; // rota para não autenticado
  denyTitle?: string;
  denyDescription?: string;
  backTo?: string; // rota para botão alternativo (ex.: dashboard)
};

export function RoleGuard({
  children,
  allowedRoles,
  redirectTo = "/login",
  denyTitle = "Acesso restrito",
  denyDescription = "Você não tem permissão para acessar esta área.",
  backTo = "/dashboard",
}: RoleGuardProps) {
  const router = useRouter();
  const { isReady, isAuthenticated, user } = useAuth();

  // Redireciona apenas quando o estado estiver pronto (evita loop/flash)
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace(redirectTo);
  }, [isReady, isAuthenticated, router, redirectTo]);

  if (!isReady) return null;
  if (!isAuthenticated) return null;

  // Se não passou allowedRoles, vira um "AuthGuard" genérico
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const role = user?.role;
  const canAccess = !!role && allowedRoles.includes(role);

  if (!canAccess) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>{denyTitle}</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4">
            <span>{denyDescription}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => router.back()}>
                Voltar
              </Button>
              <Button onClick={() => router.push(backTo)}>
                Ir para Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
