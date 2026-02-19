// src/app/(app)/excel/[templateId]/components/ui/sheet-mode-toggle.tsx
"use client"

/**
 * SheetModeToggle
 *
 * Responsabilidade:
 * - UI para alternar entre SINGLE e MULTI
 *
 * Decisão:
 * - O confirm/limpeza de dados fica no Builder (pai).
 * - Aqui só chamamos onChange com o próximo modo.
 */
import * as React from "react"
import { cn } from "@/lib/utils"

export function SheetModeToggle(props: {
  value: "SINGLE" | "MULTI"
  onChange: (next: "SINGLE" | "MULTI") => void
  className?: string
}) {
  const { value, onChange, className } = props

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => onChange("SINGLE")}
        className={cn(
          "h-10 rounded-xl px-4 text-sm font-semibold shadow-sm transition",
          value === "SINGLE"
            ? "bg-orange-500 text-white"
            : "bg-background text-foreground hover:bg-muted",
        )}
      >
        Dados únicos
      </button>

      <button
        type="button"
        onClick={() => onChange("MULTI")}
        className={cn(
          "h-10 rounded-xl px-4 text-sm font-semibold shadow-sm transition",
          value === "MULTI"
            ? "bg-slate-900 text-white"
            : "bg-background text-foreground hover:bg-muted",
        )}
      >
        Multi dados
      </button>
    </div>
  )
}
