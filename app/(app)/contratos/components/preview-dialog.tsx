"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import type { DocumentTemplate } from "@/app/modules/contratos/document-templates/document-templates.schema"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { ContractHtml } from "../../feiras/[fairId]/barracas/contrato/components/contract-html"

// ✅ ajuste o import pro seu caminho real

export function PreviewDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: DocumentTemplate | null
}) {
  const { open, onOpenChange, template } = props

  // stub só pra renderizar preview
  const fakeRow = React.useMemo(() => {
    const row: Partial<FairExhibitorRow> = {
      owner: {
        id: "preview-owner",
        personType: "PJ",
        fullName: "Exemplo de Expositor",
        document: "12.345.678/0001-90",
        email: "exemplo@onlyinbr.com.br",
        phone: "(11) 99999-9999",
      } as any,
    }
    return row as FairExhibitorRow
  }, [])

  const title = template?.title ?? "—"
  const content = (template as any)?.content ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0",
          "w-[calc(100vw-24px)] sm:w-full",
          "max-w-4xl",
          // ✅ altura limitada -> scroll vai existir
          "h-[90vh] sm:h-[85vh]",
          // ✅ layout previsível: header fixo, body rolável
          "flex flex-col "
        )}
      >
        {/* HEADER fixo */}
        <DialogHeader className="shrink-0 px-4 py-3 border-b">
          <DialogTitle>Preview do contrato</DialogTitle>
          <div className="text-xs text-muted-foreground truncate">{title}</div>
        </DialogHeader>

        <Separator />

        {/* BODY rolável */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="px-3 py-4 sm:px-4">
              {/* “Papel” */}
              <div className="mx-auto max-w-[850px] rounded-xl border bg-white shadow-sm">
                <div className="p-6 sm:p-10">
                  {!template ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum template selecionado.
                    </div>
                  ) : !content ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Template sem conteúdo para renderizar.
                    </div>
                  ) : (
                    <ContractHtml
                      fairId="preview"
                      contractId={String(template.id ?? "preview")}
                      templateTitle={title}
                      templateHtml={content}
                      exhibitorRow={fakeRow}
                      showRegistration={false}
                    />
                  )}
                </div>
              </div>

              {/* espaço extra pro final não ficar colado */}
              <div className="h-6" />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
