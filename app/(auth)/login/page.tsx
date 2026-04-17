"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const { login: saveToken, logout } = useAuth();
  const loginMutation = useLoginMutation();
  const didLogoutRef = useRef(false);

  useEffect(() => {
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
        user: data.user,
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
    <Card className="w-full overflow-hidden rounded-[20px] border-border/90 bg-white py-0 shadow-[0_28px_70px_-54px_rgba(1,0,119,0.18)] sm:shadow-[0_36px_90px_-56px_rgba(1,0,119,0.22)]">
      <div className="h-1 w-full bg-primary" />

      <div className="border-b border-border bg-white px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="font-display inline-flex rounded-md border border-border bg-muted px-3 py-1 text-xs text-primary/78">
              Only in BR
            </div>
            <div className="text-sm leading-6 text-primary/58">
              Acesso seguro ao painel administrativo
            </div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-primary sm:h-11 sm:w-11">
            <LockKeyhole className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </div>

      <CardHeader className="space-y-3 px-5 pt-6 sm:px-7 sm:pt-8">
        <CardTitle className="text-[2.2rem] sm:text-[2.6rem]">Entrar</CardTitle>
        <CardDescription className="max-w-[28ch] text-[15px] leading-7 text-primary/66 sm:text-base">
          Entre com seu e-mail e senha para continuar no painel.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5 sm:px-7 sm:pb-7">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm text-primary/84">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/34" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@onlyinbr.com"
                className="h-11 rounded-lg border-border bg-muted/55 pl-11 text-base shadow-none focus-visible:bg-white sm:h-12"
                disabled={loginMutation.isPending}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm text-primary/84">
              Senha
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/34" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                className="h-11 rounded-lg border-border bg-muted/55 pl-11 text-base shadow-none focus-visible:bg-white sm:h-12"
                disabled={loginMutation.isPending}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="mt-1 h-11 w-full rounded-lg text-base shadow-[0_18px_30px_-22px_rgba(1,0,119,0.45)] sm:h-12"
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

          <div className="border-t border-border pt-4 text-center text-sm text-primary/50">
            Painel interno Only in BR
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
