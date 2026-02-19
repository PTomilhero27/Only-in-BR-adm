"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Fair } from "@/app/modules/fairs/types";

/**
 * Hook central do formulário de vínculo Owner↔Fair (admin).
 *
 * Responsabilidade:
 * - Centralizar estado e validações do "vincular/editar"
 *   (slots de barracas + plano de pagamento + capacidade)
 * - Evitar que a tela principal fique gigante e difícil de manter.
 */

export type StallSizeValue = "SIZE_2X2" | "SIZE_3X3" | "SIZE_3X6" | "TRAILER";

export type OwnerFairStallSlotInput = {
  clientId: string;
  stallSize: StallSizeValue;
  qty: number;
  unitPriceCents: number;
};

export type PaymentInstallmentForm = {
  clientId: string;
  number: number;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;

  /**
   * MVP no front:
   * - paidAt: ISO date (YYYY-MM-DD) quando marcado como pago
   * Depois isso vira persistência no backend.
   */
  paidAt?: string | null;
  paidAmountCents?: number | null;
};

export type PaymentPlanForm = {
  installmentsCount: number; // 1 = à vista
  totalCents: number;
  installments: PaymentInstallmentForm[];
};

export function makeClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sumSlotsQty(slots: OwnerFairStallSlotInput[]) {
  return slots.reduce(
    (acc, s) => acc + (Number.isFinite(s.qty) ? s.qty : 0),
    0,
  );
}

export function sumSlotsTotalCents(slots: OwnerFairStallSlotInput[]) {
  return slots.reduce((acc, s) => {
    const qty = Number.isFinite(s.qty) ? s.qty : 0;
    const unit = Number.isFinite(s.unitPriceCents) ? s.unitPriceCents : 0;
    return acc + qty * unit;
  }, 0);
}

export function centsSplitEven(total: number, n: number) {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Normaliza e calcula capacidade.
 * - capacity/reserved/remaining vêm do backend (preferencial)
 * - fallback para ambientes ainda não migrados
 */
export function getFairCapacityInfo(fair: Fair | null) {
  const capacity =
    fair && typeof (fair as any).stallsCapacity === "number"
      ? (fair as any).stallsCapacity
      : 0;

  const reserved =
    fair && typeof (fair as any).stallsReserved === "number"
      ? (fair as any).stallsReserved
      : fair && typeof (fair as any).stallsQtyTotal === "number"
        ? (fair as any).stallsQtyTotal
        : 0;

  const remaining =
    fair && typeof (fair as any).stallsRemaining === "number"
      ? (fair as any).stallsRemaining
      : Math.max(0, capacity - reserved);

  return { capacity, reserved, remaining };
}

/**
 * Valida YYYY-MM-DD.
 * (Evita aceitar dd/MM/yyyy e evitar “parece preenchido mas não vale”.)
 */
function isValidDateInput(v?: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
}

/**
 * Valida o plano de pagamento.
 * Regras (MVP):
 * - installmentsCount >= 1
 * - todas as parcelas têm dueDate (YYYY-MM-DD)
 * - soma das parcelas == total
 */
export function validatePaymentPlan(plan: PaymentPlanForm): string | null {
  if (!plan) return "Informe o pagamento.";
  if (!Number.isFinite(plan.totalCents) || plan.totalCents < 0)
    return "Total do pagamento inválido.";
  if (!Number.isFinite(plan.installmentsCount) || plan.installmentsCount < 1)
    return "Parcelas inválidas.";

  if (
    !Array.isArray(plan.installments) ||
    plan.installments.length !== plan.installmentsCount
  ) {
    return "A lista de parcelas não confere com a quantidade informada.";
  }

  const sum = plan.installments.reduce(
    (acc, i) => acc + (Number.isFinite(i.amountCents) ? i.amountCents : 0),
    0,
  );
  if (sum !== plan.totalCents)
    return "A soma das parcelas deve ser igual ao total.";

  for (const i of plan.installments) {
    if (!isValidDateInput(i.dueDate))
      return "Informe a data de vencimento de todas as parcelas.";
    if (!Number.isFinite(i.amountCents) || i.amountCents < 0)
      return "Valor de parcela inválido.";
    if (i.paidAt && !Number.isFinite(i.paidAmountCents ?? i.amountCents))
      return "Valor pago inválido.";
  }

  return null;
}

/**
 * Gera parcelas com valores “iguais” (ajustando centavos).
 * NÃO decide dueDate nem paidAt (isso vem do usuário).
 */
function buildInstallmentsSkeleton(params: {
  installmentsCount: number;
  totalCents: number;
}) {
  const count = Math.max(1, Math.min(12, params.installmentsCount || 1));
  const amounts = centsSplitEven(params.totalCents, count);

  return amounts.map((amountCents, idx) => ({
    number: idx + 1,
    amountCents,
  }));
}

/**
 * Reconcilia um plano:
 * - Recria a quantidade de parcelas e valores (amountCents) conforme total
 * - PRESERVA dueDate/paidAt/paidAmountCents do state atual por número da parcela
 *
 * Isso evita o bug: "preenchi data, mas o hook recriou e apagou".
 */
function reconcilePaymentPlan(params: {
  nextInstallmentsCount: number;
  nextTotalCents: number;
  current?: PaymentPlanForm | null;
}): PaymentPlanForm {
  const count = Math.max(1, Math.min(12, params.nextInstallmentsCount || 1));
  const skeleton = buildInstallmentsSkeleton({
    installmentsCount: count,
    totalCents: params.nextTotalCents,
  });

  const currentMap = new Map<number, PaymentInstallmentForm>();
  for (const ins of params.current?.installments ?? [])
    currentMap.set(ins.number, ins);

  const installments: PaymentInstallmentForm[] = skeleton.map((sk) => {
    const prev = currentMap.get(sk.number);

    return {
      clientId: prev?.clientId ?? makeClientId(),
      number: sk.number,

      // preserva inputs do usuário
      dueDate: prev?.dueDate ?? "",
      paidAt: prev?.paidAt ?? null,
      paidAmountCents: prev?.paidAmountCents ?? null,

      // recalcula valor conforme total
      amountCents: sk.amountCents,
    };
  });

  return {
    installmentsCount: count,
    totalCents: params.nextTotalCents,
    installments,
  };
}

export function useOwnerFairLinkForm(initial?: {
  selectedFair?: Fair | null;
  stallSlots?: OwnerFairStallSlotInput[];
  paymentPlan?: PaymentPlanForm | null;
}) {
  const [selectedFair, setSelectedFair] = useState<Fair | null>(
    initial?.selectedFair ?? null,
  );

  const [stallSlots, setStallSlots] = useState<OwnerFairStallSlotInput[]>(
    initial?.stallSlots ?? [
      {
        clientId: makeClientId(),
        stallSize: "SIZE_3X3",
        qty: 1,
        unitPriceCents: 0,
      },
    ],
  );
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const stallsQty = useMemo(() => sumSlotsQty(stallSlots), [stallSlots]);
  const totalCents = useMemo(
    () => sumSlotsTotalCents(stallSlots),
    [stallSlots],
  );

  const capacityInfo = useMemo(
    () => getFairCapacityInfo(selectedFair),
    [selectedFair],
  );

  /**
   * ✅ Fonte da verdade do plano no state.
   * Começa com o initial (se houver), mas sempre reconcilia para garantir consistência.
   */
  const [paymentPlan, setPaymentPlanState] = useState<PaymentPlanForm>(() => {
    const base = initial?.paymentPlan ?? {
      installmentsCount: 1,
      totalCents: 0,
      installments: [
        {
          clientId: makeClientId(),
          number: 1,
          dueDate: "",
          amountCents: 0,
          paidAt: null,
          paidAmountCents: null,
        },
      ],
    };

    return reconcilePaymentPlan({
      nextInstallmentsCount: base.installmentsCount,
      nextTotalCents: base.totalCents,
      current: base,
    });
  });

  /**
   * ✅ Sempre que totalCents ou installmentsCount mudar, reconcilia preservando as datas/pagamentos.
   * Isso resolve o bug de "eu preencho e some".
   */
  useEffect(() => {
    setPaymentPlanState((current) =>
      reconcilePaymentPlan({
        nextInstallmentsCount: current.installmentsCount,
        nextTotalCents: totalCents,
        current,
      }),
    );
  }, [totalCents]);

  /**
   * Setter público: merge inteligente para não perder campos do usuário.
   * Ex.: editor muda dueDate/paidAt; a gente preserva e só reconcilia valores.
   */
  const setPaymentPlan = useCallback(
    (next: PaymentPlanForm) => {
      setPaymentPlanState((current) => {
        // mantém o que o usuário editou, mas respeita a contagem pedida
        const merged: PaymentPlanForm = {
          installmentsCount: next.installmentsCount,
          totalCents: totalCents,
          installments: next.installments,
        };

        return reconcilePaymentPlan({
          nextInstallmentsCount: merged.installmentsCount,
          nextTotalCents: totalCents,
          current: merged,
        });
      });
    },
    [totalCents],
  );

  const paymentError = useMemo(
    () => validatePaymentPlan(paymentPlan),
    [paymentPlan],
  );

  const capacityError = useMemo(() => {
    if (!selectedFair) return null;

    // Segurança: se não tiver capacidade configurada, bloqueamos.
    if (capacityInfo.capacity <= 0) {
      return "Esta feira ainda não possui capacidade configurada. Defina a capacidade no cadastro da feira.";
    }

    if (stallsQty < 1) return "A compra deve ter ao menos 1 barraca.";
    if (stallsQty > 100) return "O total não pode ultrapassar 100 barracas.";

    if (stallsQty > capacityInfo.remaining) {
      return `A compra (${stallsQty}) ultrapassa as vagas restantes da feira (${capacityInfo.remaining}).`;
    }

    return null;
  }, [selectedFair, capacityInfo.capacity, capacityInfo.remaining, stallsQty]);

  const canSubmit =
    Boolean(selectedFair?.id) &&
    !slotsError &&
    !capacityError &&
    !paymentError &&
    stallsQty >= 1 &&
    stallsQty <= 100;

  const reset = useCallback(() => {
    setSelectedFair(null);
    setStallSlots([
      {
        clientId: makeClientId(),
        stallSize: "SIZE_3X3",
        qty: 1,
        unitPriceCents: 0,
      },
    ]);
    setSlotsError(null);
    setPaymentPlanState(
      reconcilePaymentPlan({
        nextInstallmentsCount: 1,
        nextTotalCents: 0,
        current: null,
      }),
    );
  }, [setSelectedFair, setStallSlots, setSlotsError]);

  return {
    selectedFair,
    setSelectedFair,
    capacityInfo,

    stallSlots,
    setStallSlots,
    stallsQty,
    totalCents,
    slotsError,
    setSlotsError,

    // ✅ agora é realmente estável e editável
    paymentPlan,
    setPaymentPlan,
    paymentError,

    capacityError,
    canSubmit,
    reset,
  };
}
