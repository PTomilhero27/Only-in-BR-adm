"use client"

import { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * DataTableShell
 * Responsabilidade:
 * - Padronizar o “container” visual das tabelas do painel:
 *   - Cabeçalho (título + subtítulo)
 *   - Toolbar (slot opcional)
 *   - Corpo (conteúdo da tabela ou skeleton)
 *   - Footer (slot opcional para paginação/contagem)
 *
 * Decisão:
 * - Não implementamos colunas/ordenação aqui.
 *   Isso fica por conta de cada tabela de feature para evitar complexidade excessiva.
 */
export function DataTableShell({
  title,
  subtitle,
  rightInfo,
  toolbar,
  isLoading,
  isError,
  loadingSubtitleWidth = 220,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  rightInfo?: ReactNode
  toolbar?: ReactNode
  isLoading: boolean
  isError: boolean
  loadingSubtitleWidth?: number
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{title}</div>

          <div className="text-xs text-muted-foreground">
            {isLoading ? (
              <div className="mt-1">
                <Skeleton className={`h-3 w-[${loadingSubtitleWidth}px]`} />
              </div>
            ) : isError ? (
              "Não foi possível carregar. Verifique o backend e tente novamente."
            ) : (
              subtitle ?? "—"
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{rightInfo ?? null}</div>
      </div>

      {/* Toolbar (opcional) */}
      {toolbar ? <div className="border-b px-5 py-3">{toolbar}</div> : null}

      {/* Corpo */}
      <div>{children}</div>

      {/* Footer (opcional) */}
      {footer ? <div className="border-t px-5 py-3">{footer}</div> : null}
    </div>
  )
}
