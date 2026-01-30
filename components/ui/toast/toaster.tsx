"use client";

/**
 * Toaster global.
 * - Canto inferior direito
 * - Entrada com delay (sempre anima suave)
 * - Saída com animação (fade + slide)
 *
 * Regras:
 * - `open` vem do store e controla a SAÍDA (quando vira false)
 * - `ready` é local e controla a ENTRADA (delay de 25ms)
 */

import * as React from "react";
import { useToast, type ToastData } from "./use-toast";
import { ToastClose, ToastContent, ToastProgress, ToastRoot } from "./toast";

function ToastItem({
  t,
  onClose,
}: {
  t: ToastData;
  onClose: () => void;
}) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // ✅ delay curto para garantir transição de entrada sempre
    const id = window.setTimeout(() => setReady(true), 25);
    return () => window.clearTimeout(id);
  }, []);

  const isOpen = t.open === true;

  // ✅ Entrada só acontece quando está "ready" e aberto
  const show = isOpen && ready;

  return (
    <div
      className={[
        "pointer-events-auto transition-all duration-200",
        show ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6",
      ].join(" ")}
    >
      <ToastRoot variant={t.variant ?? "success"}>
        <div className="flex-1">
          <ToastContent title={t.title} description={t.description} />
        </div>

        <ToastClose onClick={onClose} />

        {/* Barra de tempo (auto close visual) */}
        <ToastProgress
          variant={t.variant ?? "success"}
          duration={t.duration ?? 4000}
        />
      </ToastRoot>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="
        fixed bottom-4 right-4 z-[100]
        flex w-full max-w-sm flex-col gap-2
        pointer-events-none
      "
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
