'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

/**
 * Seção de Usuários (Admin).
 * Responsabilidade:
 * - Servir de “container” para funcionalidades de gestão de usuários.
 * - No futuro: criar usuário, listar, editar roles/permissões.
 */
export function UsersAdminSection() {
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
          <Button disabled>Criar novo usuário</Button>
          <Button variant="secondary" disabled>Listar usuários</Button>
          <Button variant="outline" disabled>Gerenciar roles</Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          *Vamos integrar esta seção quando você me passar as rotas/DTOs do módulo de usuários/roles.
        </p>
      </Card>
    </div>
  )
}
