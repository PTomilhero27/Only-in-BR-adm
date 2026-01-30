"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider"; // ajuste o caminho conforme seu projeto
import { Spinner } from "@/components/ui/spinner";

/**
 * Página raiz ("/") do sistema.
 *
 * Responsabilidade:
 * - Verificar se o usuário está autenticado.
 * - Se estiver, redirecionar para "/dashboard".
 * - Se não estiver, redirecionar para "/login".
 *
 * Observação:
 * - Fazemos isso no client porque o estado de auth (token) parece estar no storage/context.
 * - Usamos "replace" para não deixar "/" no histórico do navegador.
 */
export default function RootPage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuth();

  useEffect(() => {
    // Espera o AuthProvider terminar de carregar/validar o estado (token etc.)
    if (!isReady) return;

    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, router]);

  // Enquanto decide, renderiza algo simples (pode ser um spinner shadcn depois)
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      <Spinner />
    </div>
  );
}
