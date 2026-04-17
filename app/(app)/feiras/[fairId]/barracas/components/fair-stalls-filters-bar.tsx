"use client";

import { ListFilter, Search, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema";

export function FairStallsFiltersBar({
  q,
  onChangeQ,
  status,
  onChangeStatus,
  onClear,
}: {
  q: string;
  onChangeQ: (v: string) => void;
  status: OwnerFairStatus | "ALL";
  onChangeStatus: (v: OwnerFairStatus | "ALL") => void;
  onClear: () => void;
}) {
  return (
    <Card className="border-border bg-white py-0 shadow-[0_20px_48px_-42px_rgba(1,0,119,0.12)]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <div className="font-display text-base text-primary">Filtrar expositores</div>
            <div className="text-sm text-primary/58">
              Busque contatos e refine a lista por etapa comercial.
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_210px_auto] xl:min-w-[740px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/34" />
              <Input
                value={q}
                onChange={(e) => onChangeQ(e.target.value)}
                placeholder="Buscar por nome, documento, email ou telefone..."
                className="h-10 rounded-lg border-border bg-muted/45 pl-11 shadow-none"
              />
            </div>

            <Select value={status} onValueChange={(v) => onChangeStatus(v as OwnerFairStatus | "ALL")}>
              <SelectTrigger className="h-10 w-full rounded-lg border-border bg-white shadow-none">
                <ListFilter className="h-4 w-4 text-primary/42" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="SELECIONADO">Selecionado</SelectItem>
                <SelectItem value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</SelectItem>
                <SelectItem value="AGUARDANDO_ASSINATURA">Aguardando assinatura</SelectItem>
                <SelectItem value="CONCLUIDO">Concluido</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={onClear} className="h-10 rounded-lg px-4 text-sm">
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
