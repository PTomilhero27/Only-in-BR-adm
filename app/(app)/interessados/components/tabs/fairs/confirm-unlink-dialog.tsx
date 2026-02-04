'use client'

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Dialog de confirmação de remoção do vínculo.
 * Mantido separado para simplificar o componente principal.
 */
export function ConfirmUnlinkDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  fairName?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const { open, onOpenChange, busy, fairName, onConfirm, onCancel } = props

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[30%]">
        <AlertDialogHeader>
          <AlertDialogTitle>Desvincular interessado</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja desvincular este interessado da feira <b>{fairName ?? 'selecionada'}</b>?
            <br />
            Essa ação remove apenas o vínculo — não exclui o interessado nem a feira.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>

          <AlertDialogAction disabled={busy} onClick={onConfirm}>
            {busy ? 'Desvinculando...' : 'Desvincular'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
