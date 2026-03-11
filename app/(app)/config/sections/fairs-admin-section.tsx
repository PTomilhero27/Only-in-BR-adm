'use client'

/**
 * Esta seção é responsável por listar, criar e editar feiras no painel administrativo.
 *
 * Responsabilidades:
 * - Buscar as feiras cadastradas
 * - Abrir modal de criação
 * - Abrir modal de edição já preenchido com os dados vindos da API
 * - Encaminhar o payload correto para create/update
 *
 * Decisão:
 * - No modo de edição, enviamos `taxes` com `id` quando a taxa já existe.
 * - Isso mantém o contrato explícito com o backend e evita que ele interprete
 *   a edição como exclusão + recriação.
 */

import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'

import { useFairsQuery } from '@/app/modules/fairs/hooks/use-fairs-query'
import { useCreateFairMutation, useUpdateFairMutation } from '@/app/modules/fairs/queries'

import { UpsertFairDialog } from '../components/fairs/upsert-fair-dialog'
import { FairAccordionCard } from '../components/fairs/fair-accordion-card'

export function FairsAdminSection() {
  const { data, isLoading } = useFairsQuery()
  const createMutation = useCreateFairMutation()
  const updateMutation = useUpdateFairMutation()

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Feiras</div>
            <div className="text-xs text-muted-foreground">
              Criação, listagem e edição de informações básicas.
            </div>
          </div>

          <UpsertFairDialog
            mode="create"
            triggerText="Criar feira"
            isSubmitting={createMutation.isPending}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync({
                name: payload.name,
                address: payload.address,
                stallsCapacity: payload.stallsCapacity,
                occurrences: payload.occurrences ?? [],
                taxes: payload.taxes ?? [],
              })
            }}
          />
        </div>

        <Separator className="my-4" />

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Carregando feiras <Spinner />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma feira cadastrada ainda.</div>
        ) : (
          <div className="space-y-3">
            {data.map((fair: any) => (
              <FairAccordionCard
                key={fair.id}
                fair={fair}
                actions={
                  <UpsertFairDialog
                    mode="edit"
                    triggerText="Editar"
                    isSubmitting={updateMutation.isPending}
                    defaultValues={{
                      id: fair.id,
                      name: fair.name,
                      address: fair.address ?? '',
                      stallsCapacity: fair.stallsCapacity ?? 0,
                      occurrences: fair.occurrences ?? [],
                      /**
                       * As taxas já existentes precisam vir com `id`.
                       * Esse `id` será reenviado no submit para o backend
                       * conseguir diferenciar update de create/delete.
                       */
                      taxes: fair.taxes ?? [],
                    }}
                    onSubmit={async (payload) => {
                      if (!payload.id) return

                      await updateMutation.mutateAsync({
                        id: payload.id,
                        payload: {
                          name: payload.name,
                          address: payload.address,
                          stallsCapacity: payload.stallsCapacity,
                          taxes: payload.taxes ?? [],
                        },
                      })
                    }}
                  />
                }
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}