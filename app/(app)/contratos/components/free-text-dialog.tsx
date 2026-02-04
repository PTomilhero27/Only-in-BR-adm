"use client"

/**
 * FreeTextDialog
 *
 * Responsabilidade:
 * - Modal para criar/editar bloco "Texto livre".
 *
 * Melhorias:
 * - Mostra badges de validação dos placeholders:
 *   - verde: placeholder conhecido no catálogo
 *   - vermelho: placeholder inválido / digitado errado
 * - Se o usuário apagar tudo, mantemos "/" para facilitar abrir sugestões.
 */

import { useEffect, useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  RichTextEditor,
  EMPTY_RICH_TEXT,
  isRichTextEmpty,
  type RichTextJson,
} from "./rich-text-editor"
import { ensureSlashWhenEmpty, validatePlaceholders } from "@/app/modules/contratos/hooks/rich-text-placeholders"




interface Props {
  open: boolean
  title?: string

  initialValue?: RichTextJson

  onCancel: () => void
  onSave: (value: RichTextJson) => void

  isSaving?: boolean
}

export function FreeTextDialog({
  open,
  title = "Texto livre",
  initialValue,
  onCancel,
  onSave,
  isSaving,
}: Props) {
  const [value, setValue] = useState<RichTextJson>(
    initialValue ?? EMPTY_RICH_TEXT,
  )
  const [snapshot, setSnapshot] = useState<RichTextJson>(
    initialValue ?? EMPTY_RICH_TEXT,
  )

  useEffect(() => {
    if (!open) return

    const base = initialValue ?? EMPTY_RICH_TEXT
    setValue(base)
    setSnapshot(base)
  }, [open, initialValue])

  /**
   * Validação "de catálogo" (placeholders existentes)
   */
  const validations = useMemo(() => validatePlaceholders(value), [value])

  const hasInvalid = useMemo(
    () => validations.some((v) => !v.isValid),
    [validations],
  )

  const canSave = useMemo(() => {
    // Mantemos a regra original (não salvar vazio).
    // OBS: "/" sozinho conta como não-vazio (intencional: facilita, mas você pode bloquear se quiser).
    return !isRichTextEmpty(value) && !Boolean(isSaving)
  }, [value, isSaving])

  function handleCancel() {
    setValue(snapshot)
    onCancel()
  }

  function handleSave() {
    if (!canSave) return
    onSave(value)
  }

  function handleChange(next: RichTextJson) {
    // ✅ Regra: se apagar tudo, deixa só "/"
    setValue(ensureSlashWhenEmpty(next))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="space-y-1">
          <DialogTitle>{title}</DialogTitle>

          <p className="text-sm text-muted-foreground">
            Escreva o texto livre. Você pode usar <b>negrito</b>, <i>itálico</i>{" "}
            e listas. Use <b>/</b> para inserir campos.
          </p>

          {/* ✅ Badges de validação */}
          {validations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {validations.map((v) => (
                <Badge
                  key={v.raw}
                  variant="outline"
                  className={
                    v.isValid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }
                  title={
                    v.isValid
                      ? `OK: ${v.label ?? v.key}`
                      : "Placeholder inválido (não existe no catálogo)"
                  }
                >
                  {v.raw}
                </Badge>
              ))}
            </div>
          )}

          {hasInvalid && (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Existem placeholders inválidos (vermelhos). Revise antes de salvar.
            </div>
          )}
        </DialogHeader>

        <div className="rounded-md border p-3">
          <RichTextEditor
            value={value}
            onChange={handleChange}
            placeholder="Digite o texto livre... (use / para inserir campos)"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={Boolean(isSaving)}
          >
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving ? "Salvando..." : "Salvar texto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
