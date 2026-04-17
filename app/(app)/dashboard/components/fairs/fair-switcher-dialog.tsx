"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Search,
  Store,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Fair } from "@/app/modules/fairs/types";
import { cn } from "@/lib/utils";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getFairDateRange(fair: Fair) {
  const occurrences = [...(fair.occurrences ?? [])].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  if (occurrences.length === 0) return null;

  const first = occurrences[0]?.startsAt;
  const last = occurrences[occurrences.length - 1]?.endsAt;

  if (!first || !last) return null;

  try {
    return `${format(new Date(first), "dd MMM", { locale: ptBR })} - ${format(
      new Date(last),
      "dd MMM yyyy",
      { locale: ptBR },
    )}`;
  } catch {
    return null;
  }
}

/**
 * Modal de seleção da feira ativa.
 *
 * Responsabilidade:
 * - Buscar por nome ou endereço
 * - Exibir uma lista mais legível e contextual
 * - Navegar ao escolher a feira
 */
export function FairSwitcherDialog(props: {
  fairs: Fair[];
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
    description = "Escolha a feira ativa para continuar.",
  } = props;

  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;

    setQuery("");

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);

    return () => window.clearTimeout(timer);
  }, [open]);

  function handleSelect(fairId: string) {
    onOpenChange(false);
    router.push(`/feiras/${fairId}`);
  }

  const filtered = React.useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return fairs;

    return fairs.filter((fair) => {
      const haystack = normalizeText(
        `${fair.name} ${fair.address} ${getFairDateRange(fair) ?? ""}`,
      );

      return haystack.includes(q);
    });
  }, [fairs, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden border-border bg-white p-0 shadow-[0_40px_100px_-56px_rgba(1,0,119,0.4)] sm:max-w-2xl">
        <DialogHeader className="gap-3 border-b border-border bg-muted/35 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-md bg-brand-green px-2.5 py-1 text-[11px] text-white">
                  Feiras ativas
                </Badge>
                <Badge variant="outline" className="rounded-md px-2.5 py-1 text-[11px]">
                  {fairs.length} ativa{fairs.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="space-y-1">
                <DialogTitle className="text-[1.65rem] leading-none text-primary">
                  {title}
                </DialogTitle>
                <DialogDescription className="max-w-[52ch] text-sm leading-6 text-primary/72">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, endereço ou data..."
                className="h-11 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm text-foreground shadow-[0_16px_32px_-28px_rgba(1,0,119,0.7)] outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
              />
            </label>

            <div className="flex items-center gap-2 text-sm text-primary/64">
              <span className="rounded-md border border-border bg-white px-3 py-2">
                {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[360px] sm:h-[420px]">
          <div className="space-y-3 p-4 sm:p-5">
            {filtered.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/25 px-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-md bg-primary/6 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base text-primary">
                  Nenhuma feira encontrada
                </div>
                <p className="mt-2 max-w-[34ch] text-sm leading-6 text-primary/64">
                  Tente outro termo de busca para localizar a feira ativa que você quer abrir.
                </p>
              </div>
            ) : (
              filtered.map((fair) => {
                const dateRange = getFairDateRange(fair);

                return (
                  <button
                    key={fair.id}
                    type="button"
                    onClick={() => handleSelect(fair.id)}
                    className={cn(
                      "group flex w-full items-start justify-between gap-4 rounded-md border border-border bg-white px-4 py-4 text-left transition",
                      "hover:-translate-y-0.5 hover:border-primary/18 hover:bg-muted/35 hover:shadow-[0_22px_36px_-34px_rgba(1,0,119,0.36)]",
                      "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 text-base leading-6 text-primary sm:text-lg">
                          {fair.name}
                        </h3>
                        <Badge className="rounded-md bg-brand-green px-2 py-1 text-[11px] text-white">
                          Ativa
                        </Badge>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-primary/68">
                        {fair.address ? (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/44" />
                            <span className="line-clamp-2">{fair.address}</span>
                          </div>
                        ) : null}

                        {dateRange ? (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 shrink-0 text-primary/44" />
                            <span>{dateRange}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-md bg-muted/45 px-2.5 py-1 text-[11px]">
                          {fair.stallsRemaining} vagas restantes
                        </Badge>
                        <Badge variant="outline" className="rounded-md bg-muted/45 px-2.5 py-1 text-[11px]">
                          {fair.stallsCapacity} barracas
                        </Badge>
                        <Badge variant="outline" className="rounded-md bg-muted/45 px-2.5 py-1 text-[11px]">
                          {fair.exhibitorsCount} expositore{fair.exhibitorsCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="hidden rounded-md border border-border bg-muted/45 px-3 py-2 text-sm text-primary/62 sm:block">
                        Abrir
                      </div>
                      <span className="flex size-10 items-center justify-center rounded-md border border-border bg-muted/25 text-primary/54 transition group-hover:border-primary/18 group-hover:bg-white group-hover:text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
