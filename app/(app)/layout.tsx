"use client";

/**
 * Layout do route group (app).
 *
 * Responsabilidades:
 * - Proteger todas as páginas do painel
 * - Evitar flash de conteúdo antes da verificação de auth
 * - Mostrar spinner enquanto valida sessão
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/providers/auth-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();

  /**
   * Controla se a verificação de auth já foi feita.
   * Enquanto false, mostramos loading.
   */
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Espera o AuthProvider carregar o token do storage
    if (!isReady) return;

    if (!isAuthenticated) {
      router.replace("/login");
      setChecked(true);
      return;
    }

    setChecked(true);
  }, [isAuthenticated, isReady, router]);

  /**
   * Enquanto verifica:
   * - não renderiza o app
   * - mostra spinner centralizado
   */
  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  /**
   * Se não autenticado, evita renderizar conteúdo.
   * O redirect já foi disparado.
   */
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
