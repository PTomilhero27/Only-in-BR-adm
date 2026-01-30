"use client";

import * as React from "react";
import { useRouter } from "next/navigation";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FairSummary } from "@/app/modules/fairs/types";

/**
 * Modal de seleção de feira (focado nas feiras ATIVAS).
 *
 * Responsabilidade:
 * - Input de busca
 * - Filtrar lista conforme digita
 * - Navegar ao selecionar
 *
 * Decisão:
 * - Recebe `open` e `onOpenChange` para o controle ficar no componente pai.
 */
export function FairSwitcherDialog(props: {
  fairs: FairSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}) {
  const {
    fairs,
    open,
    onOpenChange,
    title = "Selecionar feira",
    description = "Digite para filtrar e clique para abrir.",
  } = props;

  const router = useRouter();
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    // Sempre que abrir o modal, limpamos a busca para melhorar UX.
    if (open) setQuery("");
  }, [open]);

  function handleSelect(fairId: string) {
    onOpenChange(false);
    router.push(`/feiras/${fairId}`);
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fairs;

    return fairs.filter((f) => {
      const hay = `${f.name} ${f.address}`.toLowerCase();
      return hay.includes(q);
    });
  }, [fairs, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar feira pelo nome ou endereço..."
          />

          <div className="rounded-md border">
            <ScrollArea className="h-64">
              <ul className="p-1">
                {filtered.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">
                    Nenhuma feira encontrada.
                  </li>
                ) : (
                  filtered.map((fair) => (
                    <li key={fair.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(fair.id)}
                        className="flex w-full items-start justify-between gap-3 rounded-sm px-3 py-2 text-left hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{fair.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {fair.address}
                          </div>
                        </div>

                        <span className="shrink-0 text-xs text-muted-foreground">
                          {fair.status}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
