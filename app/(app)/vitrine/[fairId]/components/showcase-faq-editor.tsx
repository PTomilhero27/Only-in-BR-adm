"use client";

/**
 * Editor dinâmico de FAQ da vitrine.
 *
 * Cada item: { question: string, answer: string }
 * Permite adicionar, editar e remover itens.
 * Salva via PATCH faq[].
 */

import { useState, useEffect } from "react";
import { HelpCircle, Plus, Save, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useUpdateShowcaseMutation } from "@/app/modules/fair-showcase/showcase.queries";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import type { Showcase, FaqItem } from "@/app/modules/fair-showcase/showcase.schema";

export function ShowcaseFaqEditor({
  fairId,
  showcase,
  disabled = false,
}: {
  fairId: string;
  showcase: Showcase;
  disabled?: boolean;
}) {
  const updateMutation = useUpdateShowcaseMutation(fairId);

  const [items, setItems] = useState<FaqItem[]>(showcase.faq ?? []);

  useEffect(() => {
    setItems(showcase.faq ?? []);
  }, [showcase.faq]);

  function addItem() {
    setItems((prev) => [...prev, { question: "", answer: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof FaqItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function handleSave() {
    // Filtra itens vazios
    const validItems = items.filter((item) => item.question.trim());

    updateMutation.mutate(
      { faq: validItems },
      {
        onSuccess: () =>
          toast.success({ title: "FAQ salvo!" }),
        onError: (err) =>
          toast.error({
            title: "Erro ao salvar",
            subtitle: getErrorMessage(err),
          }),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-sky-500" />
            Perguntas Frequentes (FAQ)
          </CardTitle>

          {!disabled && (
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar pergunta
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/15 bg-muted/10 p-8 text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground/60">
              Nenhuma pergunta adicionada
            </p>
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              {/* Número do item */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-700">
                {index + 1}
              </div>

              <div className="flex-1 space-y-3">
                {/* Pergunta */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Pergunta</Label>
                  <Input
                    placeholder="Ex: Como funciona a reserva?"
                    value={item.question}
                    onChange={(e) =>
                      updateItem(index, "question", e.target.value)
                    }
                    disabled={disabled}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Resposta */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Resposta</Label>
                  <Textarea
                    placeholder="Resposta detalhada para esta pergunta"
                    value={item.answer}
                    onChange={(e) =>
                      updateItem(index, "answer", e.target.value)
                    }
                    disabled={disabled}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Remover */}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="mt-4 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Salvar */}
        {items.length > 0 && !disabled && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              size="sm"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {updateMutation.isPending ? "Salvando…" : "Salvar FAQ"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
