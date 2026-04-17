"use client"

import { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"

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
    <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-[0_22px_44px_-34px_rgba(1,0,119,0.38)]">
      <div className="flex flex-col gap-2 border-b border-border/70 bg-white/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="font-display text-sm text-primary">{title}</div>

          <div className="text-xs text-muted-foreground">
            {isLoading ? (
              <div className="mt-1">
                <Skeleton className="h-3" style={{ width: loadingSubtitleWidth }} />
              </div>
            ) : isError ? (
              "Nao foi possivel carregar. Verifique o backend e tente novamente."
            ) : (
              subtitle ?? "-"
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{rightInfo ?? null}</div>
      </div>

      {toolbar ? <div className="border-b border-border/70 bg-white/20 px-5 py-3">{toolbar}</div> : null}

      <div>{children}</div>

      {footer ? <div className="border-t border-border/70 bg-white/20 px-5 py-3">{footer}</div> : null}
    </div>
  )
}
