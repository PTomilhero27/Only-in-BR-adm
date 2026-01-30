"use client";

/**
 * Componentes visuais do toast.
 * Novidades:
 * - Ícone por variante
 * - Cores mais fortes
 * - Barra de tempo (auto close visual)
 */

import * as React from "react";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastVariant } from "./use-toast";

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; styles: string; bar: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    styles: "border-green-600 bg-green-600/10 text-green-900",
    bar: "bg-green-600",
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-red-600" />,
    styles: "border-red-600 bg-red-600/10 text-red-900",
    bar: "bg-red-600",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    styles: "border-yellow-600 bg-yellow-600/10 text-yellow-900",
    bar: "bg-yellow-600",
  },
};

export function ToastRoot({
  className,
  variant = "success",
  children,
}: {
  className?: string;
  variant?: ToastVariant;
  children: React.ReactNode;
}) {
  const { icon, styles } = variantConfig[variant];

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-start gap-3 rounded-md border p-4 shadow-lg",
        styles,
        className
      )}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      {children}
    </div>
  );
}

export function ToastContent({
  title,
  description,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 pr-6">
      {title ? (
        <h5 className="text-sm font-semibold leading-none">{title}</h5>
      ) : null}
      {description ? (
        <p className="text-sm leading-snug opacity-90">{description}</p>
      ) : null}
    </div>
  );
}

export function ToastClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-2 top-2 rounded-md p-1 text-foreground/60 opacity-0 transition-opacity group-hover:opacity-100"
      aria-label="Fechar"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

/**
 * Barra de tempo:
 * - começa cheia (scaleX(1))
 * - anima para vazia (scaleX(0)) durante "duration"
 */
export function ToastProgress({
  variant = "success",
  duration = 4000,
}: {
  variant?: ToastVariant;
  duration?: number;
}) {
  const { bar } = variantConfig[variant];

  const [run, setRun] = React.useState(false);

  React.useEffect(() => {
    // dispara no próximo tick para o CSS pegar o estado inicial
    const t = window.setTimeout(() => setRun(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 h-1 w-full overflow-hidden rounded-b-md">
      <div
        className={cn("h-full origin-left", bar)}
        style={{
          transform: run ? "scaleX(0)" : "scaleX(1)",
          transitionProperty: "transform",
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: "linear",
        }}
      />
    </div>
  );
}
