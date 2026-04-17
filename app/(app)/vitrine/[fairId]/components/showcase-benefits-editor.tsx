"use client";

/**
 * Editor dinâmico de benefícios da vitrine.
 *
 * Cada benefício: { icon: string, title: string, description: string }
 * Permite adicionar, editar e remover itens.
 * Salva via PATCH benefits[].
 */

import { useState, useEffect } from "react";
import { Plus, Save, Sparkles, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useUpdateShowcaseMutation } from "@/app/modules/fair-showcase/showcase.queries";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import type { Showcase, BenefitItem } from "@/app/modules/fair-showcase/showcase.schema";

const DEFAULT_ICONS = [
  "Users",
  "Star",
  "TrendingUp",
  "Shield",
  "Zap",
  "Heart",
  "Award",
  "Target",
  "MapPin",
  "Clock",
  "DollarSign",
  "Truck",
];

export function ShowcaseBenefitsEditor({
  fairId,
  showcase,
  disabled = false,
}: {
  fairId: string;
  showcase: Showcase;
  disabled?: boolean;
}) {
  const updateMutation = useUpdateShowcaseMutation(fairId);

  const [items, setItems] = useState<BenefitItem[]>(showcase.benefits ?? []);

  useEffect(() => {
    setItems(showcase.benefits ?? []);
  }, [showcase.benefits]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { icon: "Star", title: "", description: "" },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof BenefitItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function handleSave() {
    // Filtra itens vazios
    const validItems = items.filter((item) => item.title.trim());

    updateMutation.mutate(
      { benefits: validItems },
      {
        onSuccess: () =>
          toast.success({ title: "Benefícios salvos!" }),
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
            <Sparkles className="h-4 w-4 text-amber-500" />
            Benefícios
          </CardTitle>

          {!disabled && (
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar benefício
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/15 bg-muted/10 p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground/60">
              Nenhum benefício adicionado
            </p>
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                {/* Ícone */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Ícone (nome do Lucide)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_ICONS.map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => updateItem(index, "icon", iconName)}
                        disabled={disabled}
                        className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                          item.icon === iconName
                            ? "border-pink-500 bg-pink-500/10 text-pink-700 font-medium"
                            : "border-muted-foreground/15 text-muted-foreground hover:border-muted-foreground/30"
                        } disabled:pointer-events-none disabled:opacity-50`}
                      >
                        {iconName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Título */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Título</Label>
                  <Input
                    placeholder="Ex: Público estimado: 50 mil pessoas"
                    value={item.title}
                    onChange={(e) => updateItem(index, "title", e.target.value)}
                    disabled={disabled}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    placeholder="Breve descrição deste benefício"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    disabled={disabled}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Remover */}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="mt-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
              {updateMutation.isPending ? "Salvando…" : "Salvar benefícios"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
