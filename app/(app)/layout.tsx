"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/providers/auth-provider";
import { AppShellHeader } from "./components/app-shell-header";
import { onSessionExpired } from "@/app/shared/auth/session-events";
import { toast } from "@/components/ui/toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isReady, logout } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated) {
      router.replace("/login");
      setChecked(true);
      return;
    }

    setChecked(true);
  }, [isAuthenticated, isReady, router]);

  useEffect(() => {
    if (!isReady) return;

    return onSessionExpired(() => {
      logout();
      toast.warning({
        title: "Voce foi desconectado",
        subtitle: "Sua sessao expirou. Entre novamente para continuar.",
      });
      router.replace("/login");
    });
  }, [isReady, logout, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white text-foreground">
      <AppShellHeader />
      <div className="pt-[4.5rem]">{children}</div>
    </div>
  );
}
