"use client";

/**
 * Alerta de bloqueio quando a feira não está ATIVA.
 * Impede qualquer edição na vitrine.
 */

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ShowcaseBlockedAlert({
  fairStatus,
}: {
  fairStatus?: string | null;
}) {
  const label =
    fairStatus === "FINALIZADA"
      ? "finalizada"
      : fairStatus === "CANCELADA"
        ? "cancelada"
        : "inativa";

  return (
    <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Feira {label}</AlertTitle>
      <AlertDescription>
        Esta feira está {label}. Não é possível editar, publicar ou remover a
        vitrine. Somente feiras com status <strong>ATIVA</strong> podem ser
        gerenciadas.
      </AlertDescription>
    </Alert>
  );
}
