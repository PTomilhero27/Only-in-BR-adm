"use client";

/**
 * Card individual de uma feira na listagem de vitrines.
 *
 * Exibe:
 * - Nome da feira e endereço
 * - Datas (primeira e última ocorrência)
 * - Badge de status da vitrine (Publicada / Rascunho / Sem vitrine)
 * - Botão para gerenciar
 */

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileEdit,
  MapPin,
  PlusCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Fair } from "@/app/modules/fairs/types";
import type { Showcase } from "@/app/modules/fair-showcase/showcase.schema";

type ShowcaseStatus = "published" | "draft" | "none";

const statusConfig: Record<
  ShowcaseStatus,
  { label: string; variant: "default" | "secondary" | "outline"; className: string }
> = {
  published: {
    label: "Publicada",
    variant: "default",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20",
  },
  draft: {
    label: "Rascunho",
    variant: "secondary",
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20",
  },
  none: {
    label: "Sem vitrine",
    variant: "outline",
    className: "bg-muted/50 text-muted-foreground border-muted-foreground/20",
  },
};

export function ShowcaseFairCard({
  fair,
  showcase,
  showcaseStatus,
}: {
  fair: Fair;
  showcase: Showcase | null;
  showcaseStatus: ShowcaseStatus;
}) {
  const config = statusConfig[showcaseStatus];

  // Datas da primeira e última ocorrência
  const sortedOcc = [...(fair.occurrences ?? [])].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const firstDate = sortedOcc[0]?.startsAt;
  const lastDate = sortedOcc[sortedOcc.length - 1]?.endsAt;

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), "dd MMM yyyy", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  const StatusIcon =
    showcaseStatus === "published"
      ? CheckCircle2
      : showcaseStatus === "draft"
        ? FileEdit
        : PlusCircle;

  return (
    <Link href={`/vitrine/${fair.id}`} className="group block">
      <Card className="relative h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        {/* Gradient top bar */}
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400 opacity-70 transition-opacity group-hover:opacity-100" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight line-clamp-2">
              {fair.name}
            </CardTitle>
            <Badge
              variant={config.variant}
              className={`shrink-0 text-[11px] font-medium ${config.className}`}
            >
              <StatusIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Endereço */}
          {fair.address && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{fair.address}</span>
            </div>
          )}

          {/* Datas */}
          {firstDate && lastDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {formatDate(firstDate)} — {formatDate(lastDate)}
              </span>
            </div>
          )}

          {/* Cover preview */}
          {showcase?.coverImageUrl && (
            <div className="overflow-hidden rounded-md border">
              <img
                src={showcase.coverImageUrl}
                alt={`Capa de ${fair.name}`}
                className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}

          {/* CTA */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs text-muted-foreground group-hover:text-foreground"
          >
            {showcaseStatus === "none" ? "Criar vitrine" : "Gerenciar vitrine"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
