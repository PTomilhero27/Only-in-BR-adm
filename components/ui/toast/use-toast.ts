"use client";

/**
 * Hook utilitário de toast.
 * Novidades:
 * - duration por toast (tempo de vida)
 * - estado "open" para animar saída
 * - remove após término da animação
 *
 * Motivo:
 * - Controlar animação de saída sem depender de libs externas.
 */

import * as React from "react";

export type ToastVariant = "success" | "error" | "warning";

export type ToastData = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;

  /**
   * Duração do toast (ms).
   * Ex.: 4000 = 4s
   */
  duration?: number;

  /**
   * Controla animações:
   * - open=true: toast aparece
   * - open=false: toast sai (fade/slide)
   */
  open?: boolean;
};

type State = { toasts: ToastData[] };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

const DEFAULT_DURATION = 4000;
const EXIT_ANIMATION_MS = 220; // precisa bater com o duration-200~250 do CSS
const TOAST_LIMIT = 3;

function emit() {
  listeners.forEach((l) => l(memoryState));
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function setOpen(id: string, open: boolean) {
  memoryState = {
    toasts: memoryState.toasts.map((t) => (t.id === id ? { ...t, open } : t)),
  };
  emit();
}

function removeToast(id: string) {
  memoryState = { toasts: memoryState.toasts.filter((t) => t.id !== id) };
  emit();
}

function addToast(toast: ToastData) {
  const duration = toast.duration ?? DEFAULT_DURATION;

  // ✅ já entra como aberto (entrada será controlada no componente)
  const next: ToastData = { ...toast, open: true, duration };

  memoryState = {
    toasts: [next, ...memoryState.toasts].slice(0, TOAST_LIMIT),
  };
  emit();

  // fecha depois do tempo
  window.setTimeout(() => {
    dismiss(next.id);
  }, duration);
}


/**
 * dismiss:
 * - marca open=false (animação de saída)
 * - remove do estado após EXIT_ANIMATION_MS
 */
function dismiss(id: string) {
  // evita chamar duas vezes
  const toast = memoryState.toasts.find((t) => t.id === id);
  if (!toast) return;

  // se já está fechando, não faz nada
  if (toast.open === false) return;

  setOpen(id, false);

  window.setTimeout(() => {
    removeToast(id);
  }, EXIT_ANIMATION_MS);
}

export function toast(data: Omit<ToastData, "id" | "open">) {
  const id = genId();
  addToast({ id, ...data });
  return { id, dismiss: () => dismiss(id) };
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  };
}
