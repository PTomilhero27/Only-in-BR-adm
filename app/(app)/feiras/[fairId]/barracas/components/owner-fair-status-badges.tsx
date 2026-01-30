"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  FileSignature,
  CircleDot,
} from "lucide-react"
import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

/**
 * Meta do status (label + cor + ícone).
 * Responsabilidade:
 * - Definir 1 fonte da verdade para visual do status
 * - Reutilizar em KPIs, tabelas e modais
 */
export function getOwnerFairStatusMeta(status: OwnerFairStatus) {
  switch (status) {
    case "SELECIONADO":
      return {
        label: "Selecionado",
        icon: <Clock3 className="h-3.5 w-3.5" />,
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200",
      }
    case "AGUARDANDO_PAGAMENTO":
      return {
        label: "Pagamento",
        icon: <CreditCard className="h-3.5 w-3.5" />,
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200",
      }
    case "AGUARDANDO_ASSINATURA":
      return {
        label: "Assinatura",
        icon: <FileSignature className="h-3.5 w-3.5" />,
        className:
          "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-purple-200",
      }
    case "CONCLUIDO":
      return {
        label: "Concluído",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
      }
    default:
      return {
        label: status,
        icon: <CircleDot className="h-3.5 w-3.5" />,
        className:
          "border-muted bg-muted/20 text-muted-foreground dark:bg-muted/10",
      }
  }
}

/**
 * Badge simples para status (perfeito para tabela).
 */
export function OwnerFairStatusBadge({
  status,
  className,
}: {
  status: OwnerFairStatus
  className?: string
}) {
  const meta = getOwnerFairStatusMeta(status)

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-normal", meta.className, className)}
      title={meta.label}
    >
      <span className="opacity-80">{meta.icon}</span>
      <span className="text-xs">{meta.label}</span>
    </Badge>
  )
}

/**
 * Badge com contagem (para KPI de status).
 */
export function OwnerFairStatusCountBadge({
  status,
  count,
  className,
}: {
  status: OwnerFairStatus
  count: number
  className?: string
}) {
  const meta = getOwnerFairStatusMeta(status)

  return (
    <Badge
      variant="outline"
      className={cn("gap-2 font-normal", meta.className, className)}
    >
      <span className="flex items-center gap-1.5">
        <span className="opacity-80">{meta.icon}</span>
        <span className="text-xs">{meta.label}</span>
      </span>

      <span className="text-xs font-semibold">{count}</span>
    </Badge>
  )
}
