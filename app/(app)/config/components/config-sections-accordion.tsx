'use client'

import { ReactNode } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

/**
 * ConfigSectionsAccordion
 *
 * Responsabilidade:
 * - Exibir seções administrativas em cards separados
 * - Melhorar UX: área inteira "clicável" + hover + cursor
 * - Permitir identidade visual por seção via `accentClassName`
 *
 * Decisão:
 * - Cada item é um “card” isolado para ficar mais claro visualmente
 * - O trigger ocupa a linha inteira e recebe estilo de interação (hover/focus)
 */

export type ConfigSection = {
  key: string
  title: string
  description?: string
  icon?: ReactNode
  content: ReactNode

  /**
   * Classe de cor/identidade (ex.: borda/efeito)
   * Exemplos:
   * - "border-l-blue-500"
   * - "border-l-emerald-500"
   */
  accentClassName?: string
}

export function ConfigSectionsAccordion({ sections }: { sections: ConfigSection[] }) {
  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {sections.map((section) => (
        <AccordionItem
          key={section.key}
          value={section.key}
          className={cn(
            // Card separado
            'rounded-2xl border bg-card shadow-sm',
            // Uma “faixa” de identidade na esquerda
            'border-l-4',
            section.accentClassName ?? 'border-l-muted',
          )}
        >
          <AccordionTrigger
            className={cn(
              // Torna a área toda clicável e com feedback visual
              'flex w-full items-center justify-between gap-4 px-5 py-4',
              'cursor-pointer select-none',
              'hover:bg-muted/40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'rounded-2xl',
              // remove underline padrão do shadcn
              'hover:no-underline',
            )}
          >
            <div className="flex items-center gap-4">
              {section.icon ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-background">
                  {section.icon}
                </div>
              ) : null}

              <div className="text-left">
                <div className="text-sm font-semibold leading-none">{section.title}</div>
                {section.description ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {section.description}
                  </div>
                ) : null}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-5 pb-5 pt-1">
            <div className="rounded-xl border bg-background/40 p-4">
              {section.content}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
