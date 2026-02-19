'use client'

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
                // ✅ agora é taxes (array)
                taxes: payload.taxes ?? [],
              })
            }}
          />
        </div>

        <Separator className="my-4" />

        {isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
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
                      // ✅ vem do backend como FairTax[]
                      taxes: fair.taxes ?? [],
                      // occurrences (se você um dia permitir editar)
                      occurrences: fair.occurrences ?? [],
                    }}
                    onSubmit={async (payload) => {
                      if (!payload.id) return

                      await updateMutation.mutateAsync({
                        id: payload.id,
                        payload: {
                          name: payload.name,
                          address: payload.address,
                          stallsCapacity: payload.stallsCapacity,
                          // ✅ agora é taxes (array)
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
