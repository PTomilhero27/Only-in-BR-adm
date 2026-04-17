"use client";

/**
 * Formulário de informações gerais da vitrine.
 *
 * Campos: subtitle, shortDescription, description,
 *         whatsappNumber, city, state, locationLat, locationLng
 *
 * Salva via PATCH parcial (só os campos desta seção).
 */

import { useState, useEffect } from "react";
import { Save, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useUpdateShowcaseMutation } from "@/app/modules/fair-showcase/showcase.queries";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import type { Showcase } from "@/app/modules/fair-showcase/showcase.schema";

export function ShowcaseGeneralForm({
  fairId,
  showcase,
  disabled = false,
}: {
  fairId: string;
  showcase: Showcase;
  disabled?: boolean;
}) {
  const updateMutation = useUpdateShowcaseMutation(fairId);

  const [form, setForm] = useState({
    subtitle: showcase.subtitle ?? "",
    shortDescription: showcase.shortDescription ?? "",
    description: showcase.description ?? "",
    whatsappNumber: showcase.whatsappNumber ?? "",
    city: showcase.city ?? "",
    state: showcase.state ?? "",
    locationLat: showcase.locationLat?.toString() ?? "",
    locationLng: showcase.locationLng?.toString() ?? "",
  });

  // Sincroniza quando showcase atualiza (ex: após save)
  useEffect(() => {
    setForm({
      subtitle: showcase.subtitle ?? "",
      shortDescription: showcase.shortDescription ?? "",
      description: showcase.description ?? "",
      whatsappNumber: showcase.whatsappNumber ?? "",
      city: showcase.city ?? "",
      state: showcase.state ?? "",
      locationLat: showcase.locationLat?.toString() ?? "",
      locationLng: showcase.locationLng?.toString() ?? "",
    });
  }, [showcase]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const lat = form.locationLat ? parseFloat(form.locationLat) : undefined;
    const lng = form.locationLng ? parseFloat(form.locationLng) : undefined;

    updateMutation.mutate(
      {
        subtitle: form.subtitle || undefined,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        whatsappNumber: form.whatsappNumber || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        locationLat: isNaN(lat as number) ? undefined : lat,
        locationLng: isNaN(lng as number) ? undefined : lng,
      },
      {
        onSuccess: () =>
          toast.success({ title: "Informações salvas!" }),
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-blue-500" />
          Informações Gerais
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Subtítulo */}
        <div className="space-y-1.5">
          <Label htmlFor="showcase-subtitle">Subtítulo</Label>
          <Input
            id="showcase-subtitle"
            placeholder="Ex: A maior feira gastronômica da região"
            value={form.subtitle}
            onChange={(e) => handleChange("subtitle", e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Descrição curta */}
        <div className="space-y-1.5">
          <Label htmlFor="showcase-short-desc">Descrição curta (card de listagem)</Label>
          <Textarea
            id="showcase-short-desc"
            placeholder="Resumo que aparece nos cards de listagem do portal"
            value={form.shortDescription}
            onChange={(e) => handleChange("shortDescription", e.target.value)}
            disabled={disabled}
            rows={2}
          />
        </div>

        {/* Descrição completa */}
        <div className="space-y-1.5">
          <Label htmlFor="showcase-desc">Descrição completa</Label>
          <Textarea
            id="showcase-desc"
            placeholder="Texto completo sobre a feira que aparece na página de detalhes"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            disabled={disabled}
            rows={5}
          />
        </div>

        {/* WhatsApp + Cidade + Estado */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="showcase-whatsapp">WhatsApp</Label>
            <Input
              id="showcase-whatsapp"
              placeholder="5541999999999"
              value={form.whatsappNumber}
              onChange={(e) => handleChange("whatsappNumber", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="showcase-city">Cidade</Label>
            <Input
              id="showcase-city"
              placeholder="Curitiba"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="showcase-state">Estado</Label>
            <Input
              id="showcase-state"
              placeholder="PR"
              value={form.state}
              onChange={(e) => handleChange("state", e.target.value)}
              disabled={disabled}
              maxLength={2}
            />
          </div>
        </div>

        {/* Coordenadas */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="showcase-lat">Latitude</Label>
            <Input
              id="showcase-lat"
              placeholder="-25.4231"
              value={form.locationLat}
              onChange={(e) => handleChange("locationLat", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="showcase-lng">Longitude</Label>
            <Input
              id="showcase-lng"
              placeholder="-49.3099"
              value={form.locationLng}
              onChange={(e) => handleChange("locationLng", e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Salvar */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={disabled || updateMutation.isPending}
            size="sm"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {updateMutation.isPending ? "Salvando…" : "Salvar informações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
