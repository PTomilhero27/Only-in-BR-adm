"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/**
 * SheetModeSwitchAlertDialog
 *
 * Responsabilidade:
 * - Confirmar troca de modo da aba (SINGLE <-> MULTI) quando isso implica apagar dados
 *
 * Decisão:
 * - Usamos AlertDialog (shadcn) em vez de window.confirm para UX consistente no painel
 */
export function SheetModeSwitchAlertDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
}) {
  const {
    open,
    onOpenChange,
    title = "Trocar modo da aba?",
    description,
    confirmLabel = "Sim, trocar e apagar",
    cancelLabel = "Cancelar",
    onConfirm,
  } = props

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[520px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
            }}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
