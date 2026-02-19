/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * MultiColumnEditDialog
 *
 * Responsabilidade:
 * - Editar uma coluna do modo MULTI (2 linhas: header + bind)
 *   - header (texto)
 *   - fieldKey (bind)
 *   - format opcional
 *
 * Regras/UX:
 * - Ao selecionar um bind, se o header estiver vazio, usamos o label do campo como sugestão.
 * - Não renderizar objetos no JSX (isso causava "Objects are not valid as a React child").
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

import type { ExcelValueFormat } from "@/app/modules/excel/excel.schema";

type BindOption = {
  fieldKey: string;
  label: string;
  format?: ExcelValueFormat;
  group?: string;
  hint?: string;
};

type MultiColumn = {
  id: string;
  header: string;
  fieldKey: string;
  format?: ExcelValueFormat;
};

export function MultiColumnEditDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  colIndex: number | null;
  columns: MultiColumn[];
  bindOptions: BindOption[];
  onSave: (
    index: number,
    patch: Partial<{ header: string; fieldKey: string; format?: ExcelValueFormat }>,
  ) => void;
}) {
  const { open, onOpenChange, colIndex, columns, bindOptions, onSave } = props;

  const col = colIndex == null ? null : columns[colIndex] ?? null;

  const [header, setHeader] = React.useState("");
  const [fieldKey, setFieldKey] = React.useState("");
  const [format, setFormat] = React.useState<ExcelValueFormat | undefined>(undefined);

  React.useEffect(() => {
    if (!open) return;
    setHeader(col?.header ?? "");
    setFieldKey(col?.fieldKey ?? "");
    setFormat(col?.format ?? undefined);
  }, [open, col?.header, col?.fieldKey, col?.format]);

  const selectedOption = React.useMemo(() => {
    if (!fieldKey) return null;
    return bindOptions.find((b) => b.fieldKey === fieldKey) ?? null;
  }, [bindOptions, fieldKey]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, BindOption[]>();

    for (const opt of bindOptions) {
      const key = opt.group ?? "Campos";
      const arr = m.get(key) ?? [];
      arr.push(opt);
      m.set(key, arr);
    }

    const out = Array.from(m.entries()).map(([title, items]) => ({
      title,
      items: items.slice().sort((a, b) =>
        (a.label ?? a.fieldKey).localeCompare(b.label ?? b.fieldKey),
      ),
    }));

    // "Campos" por último (opcional, deixa seções específicas primeiro)
    out.sort((a, b) => (a.title === "Campos" ? 1 : 0) - (b.title === "Campos" ? 1 : 0));
    return out;
  }, [bindOptions]);

  function applySelection(opt: BindOption) {
    setFieldKey(opt.fieldKey);
    setFormat(opt.format);

    // UX: se o header estiver vazio, sugerimos o label do campo selecionado
    setHeader((prev) => {
      const current = prev.trim();
      if (current.length > 0) return prev;
      return opt.label?.trim() || prev;
    });
  }

  function handleClear() {
    setFieldKey("");
    setFormat(undefined);
  }

  function handleSave() {
    if (colIndex == null) return;

    // Normalização simples
    const safeHeader = header.trim();
    const safeFieldKey = fieldKey.trim();

    onSave(colIndex, {
      header: safeHeader,
      fieldKey: safeFieldKey,
      format,
    });

    onOpenChange(false);
  }

  const canSave = header.trim().length > 0 || fieldKey.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[880px]">
        <DialogHeader>
          <DialogTitle>Editar coluna</DialogTitle>
          <DialogDescription>
            Configure o <span className="font-medium">header</span> e o{" "}
            <span className="font-medium">bind</span> da coluna. (MULTI = 2 linhas: header + bind)
          </DialogDescription>
        </DialogHeader>

        {/* Topo: Header + Selecionado */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Header</div>
            <Input
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Ex.: Nome, Total, Status…"
            />
            <div className="text-xs text-muted-foreground">
              Dica: se você escolher um campo e o header estiver vazio, nós sugerimos o nome do campo.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Selecionado</div>

            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {selectedOption?.label ?? (fieldKey ? "Campo selecionado" : "Nenhum bind selecionado")}
                  </div>

                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {fieldKey ? fieldKey : "Selecione um campo na lista abaixo"}
                  </div>

                  {selectedOption?.hint ? (
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">
                      {selectedOption.hint}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {format ? <Badge variant="outline">{String(format)}</Badge> : null}
                  {fieldKey ? <Badge variant="secondary">{"{ }"} bind</Badge> : null}
                </div>
              </div>

              {fieldKey ? (
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
                    Limpar seleção
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Catálogo de campos */}
        <div className="rounded-xl border bg-muted/10">
          <Command>
            <div className="border-b px-3 py-2">
              <CommandInput placeholder="Buscar campo (ex.: nome, total, status…)" />
            </div>

            <CommandList className="max-h-[420px]">
              <CommandEmpty>Nenhum campo encontrado.</CommandEmpty>

              {grouped.map((g) => (
                <CommandGroup key={g.title} heading={g.title}>
                  {g.items.map((opt) => {
                    const isSelected = opt.fieldKey === fieldKey;

                    return (
                      <CommandItem
                        key={opt.fieldKey}
                        value={`${opt.label ?? ""} ${opt.fieldKey}`}
                        onSelect={() => applySelection(opt)}
                        className={cn(
                          "flex items-start justify-between gap-3",
                          isSelected && "bg-background",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {opt.label ?? opt.fieldKey}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{opt.fieldKey}</div>
                          {opt.hint ? (
                            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {opt.hint}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {opt.format ? <Badge variant="outline">{String(opt.format)}</Badge> : null}

                          {/* “Selecionar” visual (o clique real é no item inteiro) */}
                          <Badge variant={isSelected ? "default" : "secondary"}>
                            {isSelected ? "Selecionado" : "Selecionar"}
                          </Badge>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button type="button" onClick={handleSave} disabled={!canSave}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
