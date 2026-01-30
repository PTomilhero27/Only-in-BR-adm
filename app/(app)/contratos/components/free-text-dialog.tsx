"use client";

/**
 * FreeTextDialog
 *
 * Responsabilidade:
 * - Modal para criar/editar bloco "Texto livre".
 *
 * Regras:
 * - Não permite salvar vazio.
 * - Cancelar restaura snapshot do momento em que abriu.
 *
 * Decisão:
 * - Mantém a edição fora do card do documento (modal),
 *   deixando o documento mais "clean" e evitando editors inline.
 */

import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  RichTextEditor,
  EMPTY_RICH_TEXT,
  isRichTextEmpty,
  type RichTextJson,
} from "./rich-text-editor";

interface Props {
  open: boolean;
  title?: string;

  initialValue?: RichTextJson;

  onCancel: () => void;
  onSave: (value: RichTextJson) => void;

  isSaving?: boolean;
}

export function FreeTextDialog({
  open,
  title = "Texto livre",
  initialValue,
  onCancel,
  onSave,
  isSaving,
}: Props) {
  const [value, setValue] = useState<RichTextJson>(
    initialValue ?? EMPTY_RICH_TEXT,
  );
  const [snapshot, setSnapshot] = useState<RichTextJson>(
    initialValue ?? EMPTY_RICH_TEXT,
  );

  useEffect(() => {
    if (!open) return;

    const base = initialValue ?? EMPTY_RICH_TEXT;
    setValue(base);
    setSnapshot(base);
  }, [open, initialValue]);

  const canSave = useMemo(() => {
    return !isRichTextEmpty(value) && !Boolean(isSaving);
  }, [value, isSaving]);

  function handleCancel() {
    setValue(snapshot);
    onCancel();
  }

  function handleSave() {
    if (!canSave) return;
    onSave(value);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="space-y-1">
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Escreva o texto livre. Você pode usar <b>negrito</b>, <i>itálico</i>{" "}
            e listas.
          </p>
        </DialogHeader>

        <div className="rounded-md border p-3">
          <RichTextEditor
            value={value}
            onChange={setValue}
            placeholder="Digite o texto livre..."
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={Boolean(isSaving)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving ? "Salvando..." : "Salvar texto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
