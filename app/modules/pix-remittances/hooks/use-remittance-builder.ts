import { useState, useMemo } from "react";
import {
  FairSupplier,
  getPayableSupplierInstallments,
  getSupplierRemittanceAvailableCents,
} from "../../fair-suppliers/fair-suppliers.schema";
import { PixRemittanceMode, CreatePixRemittancePayload } from "../types";

/**
 * Este hook controla a seleção dos fornecedores e o cálculo dos lotes da remessa.
 */
export function useRemittanceBuilder(
  fairId: string,
  allSuppliers: FairSupplier[],
  options: { includeInRemittance?: boolean } = {},
) {
  // Estado de seleção: Armazena os IDs dos fornecedores selecionados
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Valores da remessa por fornecedor: ID -> valor em centavos
  const [amountsCents, setAmountsCents] = useState<Record<string, number>>({});
  
  // Modo de geração
  const [mode, setMode] = useState<PixRemittanceMode>("SINGLE");

  // Fornecedores elegíveis (precisam ter validação passando ou não estar inaptos na listagem,
  // mas como recebemos a lista, vamos apenas expor a lógica de seleção e valores)
  
  const toggleSelection = (supplier: FairSupplier) => {
    const next = new Set(selectedIds);
    if (next.has(supplier.id)) {
      next.delete(supplier.id);
    } else {
      next.add(supplier.id);
      // Ao selecionar, preenche automaticamente o valor pendente se não existir no estado
      if (amountsCents[supplier.id] === undefined) {
        setAmountsCents((prev) => ({
          ...prev,
          [supplier.id]: getSupplierRemittanceAvailableCents(supplier, options),
        }));
      }
    }
    setSelectedIds(next);
  };

  const selectAll = (suppliers: FairSupplier[]) => {
    const next = new Set(selectedIds);
    const newAmounts = { ...amountsCents };
    suppliers.forEach((s) => {
      next.add(s.id);
      if (newAmounts[s.id] === undefined) {
        newAmounts[s.id] = getSupplierRemittanceAvailableCents(s, options);
      }
    });
    setSelectedIds(next);
    setAmountsCents(newAmounts);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const setSupplierAmount = (supplierId: string, amount: number) => {
    setAmountsCents((prev) => ({
      ...prev,
      [supplierId]: amount,
    }));
  };

  // Obter apenas os fornecedores selecionados (mantendo a ordem da lista original)
  const selectedSuppliers = useMemo(() => {
    return allSuppliers.filter((s) => selectedIds.has(s.id));
  }, [allSuppliers, selectedIds]);

  // Cálculo de lotes
  const splitLotes = useMemo(() => {
    if (mode === "SINGLE" || selectedSuppliers.length === 0) {
      return {
        lote1: selectedSuppliers,
        lote2: [],
      };
    }
    const half = Math.ceil(selectedSuppliers.length / 2);
    return {
      lote1: selectedSuppliers.slice(0, half),
      lote2: selectedSuppliers.slice(half),
    };
  }, [mode, selectedSuppliers]);

  // Resumo
  const summary = useMemo(() => {
    const totalRemittanceCents = selectedSuppliers.reduce(
      (acc, s) => acc + (amountsCents[s.id] || 0),
      0
    );
    const totalLote1Cents = splitLotes.lote1.reduce(
      (acc, s) => acc + (amountsCents[s.id] || 0),
      0
    );
    const totalLote2Cents = splitLotes.lote2.reduce(
      (acc, s) => acc + (amountsCents[s.id] || 0),
      0
    );

    return {
      selectedCount: selectedSuppliers.length,
      totalRemittanceCents,
      lote1Count: splitLotes.lote1.length,
      totalLote1Cents,
      lote2Count: splitLotes.lote2.length,
      totalLote2Cents,
      remittancesCount: mode === "SINGLE" ? 1 : 2,
    };
  }, [selectedSuppliers, splitLotes, amountsCents, mode]);

  // Preparar Payload
  const getPayload = (): CreatePixRemittancePayload => {
    const items = selectedSuppliers.flatMap((s) => {
      // Determina o grupo com base em qual lote o fornecedor caiu
      let group = 1;
      if (mode === "SPLIT_TWO") {
        const isLote2 = splitLotes.lote2.some((l2) => l2.id === s.id);
        if (isLote2) group = 2;
      }

      let remainingAmountCents = amountsCents[s.id] || 0;

      return getPayableSupplierInstallments(s, options).flatMap((installment) => {
        const installmentPendingCents = Math.max(
          0,
          (installment.amountCents ?? 0) - (installment.paidAmountCents ?? 0),
        );
        const amountCents = Math.min(remainingAmountCents, installmentPendingCents);
        remainingAmountCents -= amountCents;

        if (amountCents <= 0) return [];

        return {
          payeeType: "SUPPLIER" as const,
          supplierInstallmentId: installment.id!,
          amountCents,
          ...(mode === "SPLIT_TWO" ? { group } : {}),
        };
      });
    });

    return {
      fairId,
      mode,
      items,
    };
  };

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    amountsCents,
    setSupplierAmount,
    mode,
    setMode,
    selectedSuppliers,
    splitLotes,
    summary,
    getPayload,
  };
}
