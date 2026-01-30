"use client";

/**
 * Página de login.
 * - Faz login via React Query mutation
 * - Salva token no AuthProvider
 * - Mostra feedback via Toast (success/error)
 * - Usa Spinner no botão durante o loading
 *
 * Observação:
 * - UX limpa (sem erro fixo na tela)
 * - Mensagem vem do backend (getErrorMessage)
 */

import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

import { useAuth } from "@/providers/auth-provider";
import { useLoginMutation } from "@/app/modules/auth/queries";


import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { toast } from "@/components/ui/toast";
import { useEffect, useRef } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { login: saveToken, logout, } = useAuth();
  const loginMutation = useLoginMutation();
  const didLogoutRef = useRef(false);

  useEffect(() => {
    /**
     * Garante que o logout aconteça apenas UMA vez,
     * mesmo em re-renders ou StrictMode.
     */
    if (didLogoutRef.current) return;

    logout();
    didLogoutRef.current = true;
  }, [logout]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    try {
      const data = await loginMutation.mutateAsync({ email, password });

      saveToken({
        token: data.access_token,
        user: data.user
      });
      toast.success({
        title: "Bem-vindo!",
        subtitle: "Login realizado com sucesso.",
      });

      router.push("/dashboard");
    } catch (err) {
      toast.error({
        title: "Erro",
        subtitle: getErrorMessage(err),
      });
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Entrar</CardTitle>
        <CardDescription>Acesse o painel da feira gastronômica</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled={loginMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={loginMutation.isPending}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" />
                Entrando
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
