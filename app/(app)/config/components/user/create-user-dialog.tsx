"use client"

import * as React from "react"
import { z } from "zod"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { getErrorMessage } from "@/app/shared/utils/get-error-message"

import { useRegisterUserMutation } from "@/app/modules/auth/queries"

const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

type FormState = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: Props) {
  const mutation = useRegisterUserMutation()

  const [form, setForm] = React.useState<FormState>({
    name: "",
    email: "",
    password: "",
  })

  const [touched, setTouched] = React.useState<Record<keyof FormState, boolean>>({
    name: false,
    email: false,
    password: false,
  })

  const isSaving = mutation.isPending

  const errors = React.useMemo(() => {
    const res = formSchema.safeParse(form)
    if (res.success) return {}
    const out: Record<string, string> = {}
    for (const issue of res.error.issues) out[issue.path.join(".")] = issue.message
    return out
  }, [form])

  const canSubmit = Object.keys(errors).length === 0 && form.name && form.email && form.password && !isSaving

  React.useEffect(() => {
    if (!open) return
    mutation.reset()
    setForm({ name: "", email: "", password: "" })
    setTouched({ name: false, email: false, password: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit() {
    const parsed = formSchema.safeParse(form)
    if (!parsed.success) {
      setTouched({ name: true, email: true, password: true })
      return
    }

    try {
      // ✅ por enquanto tudo ADMIN
      const created = await mutation.mutateAsync({ ...parsed.data, role: "ADMIN" })

      toast.success({
        title: "Usuário criado",
        subtitle: `${created.name} (${created.email})`,
      })

      onOpenChange(false)
    } catch (err) {
      toast.error({
        title: "Erro ao criar usuário",
        subtitle: getErrorMessage(err),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          "p-0 w-[calc(100vw-24px)] sm:w-full",
          "max-w-lg",
          "max-h-[90vh] sm:max-h-[85vh]",
          "flex flex-col overflow-hidden",
        ].join(" ")}
      >
        <DialogHeader className="shrink-0 px-4 py-3 border-b">
          <DialogTitle>Criar novo usuário</DialogTitle>
          <div className="text-xs text-muted-foreground">Somente Admin. Por enquanto, todos serão ADMIN.</div>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-4 py-4 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Ex.: Maria Silva"
              disabled={isSaving}
            />
            {touched.name && errors.name ? <div className="text-xs text-destructive">{errors.name}</div> : null}
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="email@onlyinbr.com.br"
              disabled={isSaving}
            />
            {touched.email && errors.email ? <div className="text-xs text-destructive">{errors.email}</div> : null}
          </div>

          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="mín. 6 caracteres"
              disabled={isSaving}
            />
            {touched.password && errors.password ? (
              <div className="text-xs text-destructive">{errors.password}</div>
            ) : null}
          </div>

          <Separator />

          {/* “Preparado pro futuro”: role */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value="ADMIN" disabled className="bg-muted/30" />
            <div className="text-xs text-muted-foreground">
              Em breve: seleção de roles/permissões.
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-4 py-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving} className="w-full sm:w-auto">
              Cancelar
            </Button>

            <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full sm:w-auto">
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  Criando
                  <Spinner className="h-4 w-4" />
                </span>
              ) : (
                "Criar usuário"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
