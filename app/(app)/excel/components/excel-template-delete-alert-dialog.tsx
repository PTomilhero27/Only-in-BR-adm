// src/modules/excel/components/excel-template-delete-alert-dialog.tsx
"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog"

/**
 * Confirmação de exclusão de template.
 * Responsabilidade:
 * - Evitar exclusões acidentais
 */
export function ExcelTemplateDeleteAlertDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  templateName: string
  onConfirm: () => Promise<void>
  isDeleting?: boolean
}) {
  const { open, onOpenChange, templateName, onConfirm, isDeleting } = props

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir template?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir <strong>{templateName || "este template"}</strong>. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!!isDeleting}
            onClick={(e) => {
              e.preventDefault()
              void onConfirm()
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
