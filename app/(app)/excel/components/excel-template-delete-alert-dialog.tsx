// src/modules/excel/components/excel-template-delete-alert-dialog.tsx
"use client"

import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

export function ExcelTemplateDeleteAlertDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  templateName: string
  onConfirm: () => Promise<void>
  isDeleting?: boolean
}) {
  const { open, onOpenChange, templateName, onConfirm, isDeleting } = props

  const safeName = templateName?.trim() || "este template"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[520px]">
        <AlertDialogHeader className="space-y-3">
          {/* Header com ícone */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>

            <div className="space-y-1">
              <AlertDialogTitle className="text-lg">
                Excluir template?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed">
                Você está prestes a excluir{" "}
                <span className="font-semibold text-foreground">{safeName}</span>.
                Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </div>
          </div>


        </AlertDialogHeader>

        <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={!!isDeleting}
            className="h-10"
          >
            Cancelar
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={!!isDeleting}
            onClick={(e) => {
              e.preventDefault()
              void onConfirm()
            }}
            className="h-10 bg-destructive text-white  hover:bg-destructive/90"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
