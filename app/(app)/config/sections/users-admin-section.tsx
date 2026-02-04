"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CreateUserDialog } from "../components/user/create-user-dialog"


export function UsersAdminSection() {
  const [createOpen, setCreateOpen] = React.useState(false)

  return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">Gestão de usuários</div>
            <div className="text-xs text-muted-foreground">
              Crie, liste e edite usuários. Defina roles e permissões.
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreateOpen(true)}>Criar novo usuário</Button>

            <Button variant="secondary" disabled>
              Listar usuários
            </Button>

            <Button variant="outline" disabled>
              Gerenciar roles
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            *Listagem e roles entram quando o módulo de users/roles estiver pronto no backend.
          </p>
        </Card>

        <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
  )
}
