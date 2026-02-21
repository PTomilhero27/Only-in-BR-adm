"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateMapTemplateMutation, useUpdateMapTemplateMutation } from "@/app/modules/mapa-templates/map-templates.queries";

type TemplateMeta = {
  id: string;
  title: string;
  description?: string | null;
  worldWidth: number;
  worldHeight: number;
};

type Props =
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      mode: "create";
      initial?: never;
    }
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      mode: "edit";
      initial: TemplateMeta; // ✅ vem pronto do pai
    };

function safeInt(v: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(200, Math.floor(n));
}

export function MapTemplateMetaDialog(props: Props) {
  const { open, onOpenChange, mode } = props;

  const createMut = useCreateMapTemplateMutation();
  const updateMut = useUpdateMapTemplateMutation(mode === "edit" ? props.initial.id : "");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [worldWidth, setWorldWidth] = React.useState(2000);
  const [worldHeight, setWorldHeight] = React.useState(1200);

  // ✅ sempre hidrata state a partir do "initial" SEM buscar nada
  React.useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      setTitle("");
      setDescription("");
      setWorldWidth(2000);
      setWorldHeight(1200);
      return;
    }

    const t = props.initial;
    setTitle(t.title);
    setDescription(t.description ?? "");
    setWorldWidth(t.worldWidth);
    setWorldHeight(t.worldHeight);
  }, [open, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBusy = createMut.isPending || updateMut.isPending;

  async function onSubmit() {
    const payloadBase = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      worldWidth: safeInt(worldWidth, 2000),
      worldHeight: safeInt(worldHeight, 1200),
    };

    if (!payloadBase.title) return;

    if (mode === "create") {
      await createMut.mutateAsync({
        ...payloadBase,
        backgroundUrl: null,
        elements: [],
      } as any);

      onOpenChange(false);
      return;
    }

    await updateMut.mutateAsync(payloadBase as any);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isBusy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Criar nova planta" : "Editar planta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex.: Praça Central"
              value={title}
              disabled={isBusy}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Ex.: Planta padrão para eventos"
              value={description}
              disabled={isBusy}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-medium">Tamanho do mundo</div>
            <p className="text-xs text-muted-foreground">
              Define a área base do editor (não é a imagem de fundo).
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Largura</Label>
                <Input
                  type="number"
                  value={worldWidth}
                  disabled={isBusy}
                  onChange={(e) => setWorldWidth(Number(e.target.value) || 2000)}
                />
              </div>

              <div className="space-y-2">
                <Label>Altura</Label>
                <Input
                  type="number"
                  value={worldHeight}
                  disabled={isBusy}
                  onChange={(e) => setWorldHeight(Number(e.target.value) || 1200)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={isBusy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            <Button disabled={isBusy || !title.trim()} onClick={onSubmit}>
              {isBusy ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}