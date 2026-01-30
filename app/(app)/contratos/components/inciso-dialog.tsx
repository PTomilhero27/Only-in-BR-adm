"use client";

/**
 * IncisosDialog (multi-incisos)
 *
 * Ajustes deste passo:
 * - Editor menor (altura reduzida)
 * - Animação ao adicionar inciso (fade/slide)
 * - Auto-scroll até o novo inciso
 * - Foco automático no editor recém-criado
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

import {
  RichTextEditor,
  EMPTY_RICH_TEXT,
  isRichTextEmpty,
  type RichTextJson,
} from "./rich-text-editor";

export type IncisoDraft = {
  id: string;
  number: string;
  richText: RichTextJson;
};

interface Props {
  open: boolean;
  startNumber: string;
  initialItems?: IncisoDraft[];
  onCancel: () => void;
  onSave: (items: IncisoDraft[]) => void;
  isSaving?: boolean;
}

function parseStart(startNumber: string) {
  const [clauseStr, idxStr] = startNumber.split(".");
  const clause = Number(clauseStr);
  const startIndex = Number(idxStr);

  return {
    clause: Number.isFinite(clause) ? clause : 1,
    startIndex: Number.isFinite(startIndex) ? startIndex : 1,
  };
}

function buildNumber(clauseOrder: number, idx: number) {
  return `${clauseOrder}.${idx}`;
}

export function IncisosDialog({
  open,
  startNumber,
  initialItems,
  onCancel,
  onSave,
  isSaving,
}: Props) {
  const { clause, startIndex } = useMemo(
    () => parseStart(startNumber),
    [startNumber],
  );

  const [items, setItems] = useState<IncisoDraft[]>([]);
  const [snapshot, setSnapshot] = useState<IncisoDraft[]>([]);

  /**
   * Guarda o ID do último inciso adicionado para:
   * - animar
   * - scroll
   * - focar
   */
  const lastAddedIdRef = useRef<string | null>(null);

  /**
   * Ref do container scrollável (para scroll mais previsível)
   */
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const base: IncisoDraft[] =
      initialItems && initialItems.length > 0
        ? initialItems
        : [
            {
              id: crypto.randomUUID(),
              number: buildNumber(clause, startIndex),
              richText: EMPTY_RICH_TEXT,
            },
          ];

    setItems(base);
    setSnapshot(structuredClone(base));
    lastAddedIdRef.current = null;
  }, [open, initialItems, clause, startIndex]);

  const hasAnyEmpty = useMemo(
    () => items.some((it) => isRichTextEmpty(it.richText)),
    [items],
  );

  const canSave = useMemo(
    () => !hasAnyEmpty && !isSaving,
    [hasAnyEmpty, isSaving],
  );

  function handleCancel() {
    setItems(snapshot);
    onCancel();
  }

  function handleSave() {
    if (!canSave) return;
    onSave(items);
  }

  function renumber(next: IncisoDraft[]) {
    return next.map((it, i) => ({
      ...it,
      number: buildNumber(clause, startIndex + i),
    }));
  }

  function handleAddInciso() {
    const newId = crypto.randomUUID();
    lastAddedIdRef.current = newId;

    setItems((prev) => {
      const next = [
        ...prev,
        {
          id: newId,
          number: buildNumber(clause, startIndex + prev.length),
          richText: EMPTY_RICH_TEXT,
        },
      ];
      return renumber(next);
    });
  }

  function handleRemoveInciso(id: string) {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      const safe = next.length > 0 ? next : prev;
      return renumber(safe);
    });
  }

  function handleChangeRichText(id: string, richText: RichTextJson) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, richText } : it)),
    );
  }

  /**
   * ✅ Após adicionar um inciso:
   * - scroll até o título do inciso
   * - foco no editor (ProseMirror)
   */
  useEffect(() => {
    const id = lastAddedIdRef.current;
    if (!id) return;
    if (!open) return;

    // Espera o DOM renderizar
    const t = window.setTimeout(() => {
      const root = scrollAreaRef.current ?? document;
      const anchor = (root as any).querySelector?.(
        `[data-inciso-anchor="${id}"]`,
      ) as HTMLElement | null;

      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });

        // Foco no editor dentro do card (ProseMirror)
        const card = anchor.closest?.("[data-inciso-card]") as HTMLElement | null;
        const pm = card?.querySelector?.(".ProseMirror") as HTMLElement | null;
        pm?.focus();
      }

      // reseta para não ficar repetindo foco
      lastAddedIdRef.current = null;
    }, 80);

    return () => window.clearTimeout(t);
  }, [items, open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0 space-y-1">
          <DialogTitle>Incisos</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adicione um ou mais incisos. Você pode usar <b>negrito</b>,{" "}
            <i>itálico</i> e listas.
          </p>
        </DialogHeader>

        {/* ✅ Corpo com scroll */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto pr-2 space-y-4 mt-4"
        >
          {hasAnyEmpty && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              Preencha todos os incisos antes de salvar.
            </div>
          )}

          {items.map((it) => {
            const isEmpty = isRichTextEmpty(it.richText);

            // ✅ aplica animação quando ele é o último criado
            const isJustAdded = false; // (a animação será via CSS “mounted”, ver abaixo)

            return (
              <div
                key={it.id}
                data-inciso-card
                className={cn(
                  "rounded-lg border p-3",
                  "transition-all duration-200 ease-out",
                  "animate-in fade-in slide-in-from-bottom-2",
                  isEmpty ? "ring-1 ring-orange-300" : undefined,
                )}
              >
                {/* âncora do scroll — fica no título */}
                <div
                  data-inciso-anchor={it.id}
                  className="mb-2 flex items-start justify-between gap-3"
                >
                  <div className="text-sm font-medium">Inciso {it.number}</div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveInciso(it.id)}
                      disabled={Boolean(isSaving)}
                      title="Remover inciso"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>

                {/* ✅ Editor menor: min height reduzida via className */}
                <RichTextEditor
                  value={it.richText}
                  onChange={(v) => handleChangeRichText(it.id, v)}
                  placeholder="Digite o texto do inciso..."
                  className="min-h-[120px]"
                />
              </div>
            );
          })}
        </div>

        {/* Footer fixo */}
        <DialogFooter className="shrink-0 justify-between gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddInciso}
            disabled={Boolean(isSaving)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar inciso
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={Boolean(isSaving)}
            >
              Cancelar
            </Button>

            <Button onClick={handleSave} disabled={!canSave}>
              {isSaving ? "Salvando..." : "Salvar incisos"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
