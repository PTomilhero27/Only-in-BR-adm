"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { Calculator, Pencil, Plus, RefreshCw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast/use-toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import {
  useCreateFairSupplierMutation,
  useUpdateFairSupplierMutation,
} from "../fair-suppliers.queries";
import {
  formatMoneyBRLFromCents,
  normalizeDigits,
  type FairSupplier,
  type PixKeyType,
  type UpsertFairSupplierPayload,
} from "../fair-suppliers.schema";

type FormState = {
  name: string;
  document: string;
  email: string;
  phone: string;
  serviceDescription: string;
  pixKeyType: PixKeyType;
  pixKey: string;
  totalAmount: string;
  installmentsCount: "1" | "2";
  firstAmount: string;
  firstDueDate: string;
  secondAmount: string;
  secondDueDate: string;
  notes: string;
};

function centsFromBRL(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function brlFromCents(cents?: number | null) {
  if (!cents) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function dateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function initialForm(supplier?: FairSupplier | null): FormState {
  const sortedInstallments = [...(supplier?.installments ?? [])].sort((a, b) => a.number - b.number);
  const total = supplier?.totalAmountCents ?? 0;
  const first = sortedInstallments[0];
  const second = sortedInstallments[1];

  return {
    name: supplier?.name ?? "",
    document: supplier?.document ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    serviceDescription: supplier?.serviceDescription ?? "",
    pixKeyType: supplier?.pixKeyType ?? "CNPJ",
    pixKey: supplier?.pixKey ?? "",
    totalAmount: brlFromCents(total),
    installmentsCount: second ? "2" : "1",
    firstAmount: brlFromCents(first?.amountCents ?? total),
    firstDueDate: dateInputValue(first?.dueDate),
    secondAmount: brlFromCents(second?.amountCents),
    secondDueDate: dateInputValue(second?.dueDate),
    notes: supplier?.notes ?? "",
  };
}

function validatePix(type: PixKeyType, key: string) {
  const digits = normalizeDigits(key);
  if (type === "CPF") return digits.length === 11;
  if (type === "CNPJ") return digits.length === 14;
  if (type === "EMAIL") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
  if (type === "PHONE") return digits.length >= 10;
  return key.trim().length >= 8;
}

export function FairSupplierUpsertDialog({
  fairId,
  supplier,
  trigger,
}: {
  fairId: string;
  supplier?: FairSupplier | null;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(supplier));
  const createMutation = useCreateFairSupplierMutation(fairId);
  const updateMutation = useUpdateFairSupplierMutation(fairId);
  const isEditing = !!supplier?.id;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const totals = useMemo(() => {
    const total = centsFromBRL(form.totalAmount);
    const first = form.installmentsCount === "1" ? total : centsFromBRL(form.firstAmount);
    const second = form.installmentsCount === "1" ? 0 : centsFromBRL(form.secondAmount);
    return { total, first, second, sum: first + second, remaining: Math.max(0, total - first) };
  }, [form.firstAmount, form.installmentsCount, form.secondAmount, form.totalAmount]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const documentDigits = normalizeDigits(form.document);
    if (!form.name.trim()) errors.push("Informe o nome.");
    if (![11, 14].includes(documentDigits.length)) errors.push("CPF/CNPJ deve ter 11 ou 14 digitos.");
    if (!form.serviceDescription.trim()) errors.push("Informe o servico prestado.");
    if (!form.pixKey.trim() || !validatePix(form.pixKeyType, form.pixKey.trim())) {
      errors.push("Informe uma chave PIX valida para o tipo selecionado.");
    }
    if (totals.total <= 0) errors.push("Informe o valor total contratado.");
    if (form.installmentsCount === "2" && totals.sum !== totals.total) {
      errors.push("A soma das parcelas deve ser igual ao valor total contratado.");
    }
    return errors;
  }, [form, totals]);

  function buildPayload(): UpsertFairSupplierPayload {
    const installments =
      form.installmentsCount === "1"
        ? [
            {
              id: supplier?.installments?.[0]?.id,
              number: 1,
              amountCents: totals.total,
              dueDate: form.firstDueDate || null,
            },
          ]
        : [
            {
              id: supplier?.installments?.[0]?.id,
              number: 1,
              amountCents: totals.first,
              dueDate: form.firstDueDate || null,
            },
            {
              id: supplier?.installments?.[1]?.id,
              number: 2,
              amountCents: totals.second,
              dueDate: form.secondDueDate || null,
            },
          ];

    return {
      name: form.name.trim(),
      document: form.document.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      serviceDescription: form.serviceDescription.trim(),
      pixKeyType: form.pixKeyType,
      pixKey: form.pixKey.trim(),
      totalAmountCents: totals.total,
      installments,
      notes: form.notes.trim() || null,
    };
  }

  async function handleSubmit() {
    if (validationErrors.length > 0) {
      toast({
        variant: "warning",
        title: "Revise os dados do fornecedor",
        description: validationErrors[0],
      });
      return;
    }

    try {
      const payload = buildPayload();
      if (isEditing && supplier?.id) {
        await updateMutation.mutateAsync({ supplierId: supplier.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast({
        variant: "success",
        title: isEditing ? "Fornecedor atualizado" : "Fornecedor cadastrado",
      });
      setOpen(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Nao foi possivel salvar",
        description: getErrorMessage(err),
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setForm(initialForm(supplier));
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-10 rounded-lg">
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>
            Cadastre os dados usados para preparar itens pagaveis da remessa PIX Itau CNAB 240.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="CPF/CNPJ">
              <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Servico prestado">
              <Input
                value={form.serviceDescription}
                onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })}
              />
            </Field>
            <Field label="Tipo da chave PIX">
              <Select
                value={form.pixKeyType}
                onValueChange={(value) => setForm({ ...form, pixKeyType: value as PixKeyType })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNPJ">CNPJ</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="PHONE">Telefone</SelectItem>
                  <SelectItem value="RANDOM">Aleatoria</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Chave PIX">
              <Input value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} />
              {form.pixKey && (
                <div className="text-[10px] text-primary/58">
                  O tipo da chave PIX será identificado pelo backend ao salvar.
                </div>
              )}
            </Field>
            <Field label="Valor total contratado">
              <Input
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                placeholder="0,00"
              />
            </Field>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
              <Calculator className="h-4 w-4" />
              Parcelas do fornecedor
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Quantidade">
                <Select
                  value={form.installmentsCount}
                  onValueChange={(value) => {
                    const nextCount = value as "1" | "2";
                    setForm({
                      ...form,
                      installmentsCount: nextCount,
                      firstAmount: nextCount === "1" ? brlFromCents(totals.total) : form.firstAmount,
                      secondAmount: nextCount === "1" ? "" : brlFromCents(totals.remaining),
                    });
                  }}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 parcela</SelectItem>
                    <SelectItem value="2">2 parcelas</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Parcela 1">
                <Input
                  value={form.installmentsCount === "1" ? brlFromCents(totals.total) : form.firstAmount}
                  onChange={(e) => setForm({ ...form, firstAmount: e.target.value })}
                  disabled={form.installmentsCount === "1"}
                />
              </Field>
              <Field label="Vencimento 1">
                <Input
                  type="date"
                  value={form.firstDueDate}
                  onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })}
                />
              </Field>
              <Field label="Parcela 2">
                <Input
                  value={form.secondAmount}
                  onChange={(e) => setForm({ ...form, secondAmount: e.target.value })}
                  disabled={form.installmentsCount === "1"}
                />
              </Field>
              <Field label="Vencimento 2">
                <Input
                  type="date"
                  value={form.secondDueDate}
                  onChange={(e) => setForm({ ...form, secondDueDate: e.target.value })}
                  disabled={form.installmentsCount === "1"}
                />
              </Field>
            </div>
            <div className="mt-3 text-xs text-primary/58">
              Soma das parcelas: {formatMoneyBRLFromCents(totals.sum)} de {formatMoneyBRLFromCents(totals.total)}
            </div>
          </div>

          <Field label="Observacoes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-20"
            />
          </Field>

          {validationErrors.length > 0 ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <Pencil className="h-4 w-4" />
              <AlertTitle>Dados pendentes para remessa PIX</AlertTitle>
              <AlertDescription className="text-amber-900/75">
                {validationErrors.join(" ")}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar fornecedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-primary/62">{label}</Label>
      {children}
    </div>
  );
}
