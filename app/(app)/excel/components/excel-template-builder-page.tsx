// src/modules/excel/pages/excel-template-builder-page.tsx
"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useExcelTemplateQuery, useUpdateExcelTemplateMutation } from "@/app/modules/excel/excel.queries"
import { ExcelTemplateSheetInput } from "@/app/modules/excel/excel.schema"


/**
 * Builder MVP do template.
 * Responsabilidade:
 * - Carregar template
 * - Exibir e permitir editar `sheets` via JSON (forma mais segura no começo)
 * - Salvar via PATCH (replace total quando sheets é enviado)
 *
 * Decisão:
 * - Antes de criar a UI visual (drag/drop), validamos o “pipeline” inteiro.
 * - Isso evita refactor caro e te dá velocidade no MVP.
 */
export function ExcelTemplateBuilderPage(props: { templateId: string }) {
  const { templateId } = props

  const detail = useExcelTemplateQuery(templateId)
  const updateMut = useUpdateExcelTemplateMutation()

  const template = detail.data?.template

  const initialJson = useMemo(() => {
    if (!template) return ""
    // Convertendo para o shape de input (sem ids) para facilitar edição
    const sheets: ExcelTemplateSheetInput[] = template.sheets
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        name: s.name,
        order: s.order,
        dataset: s.dataset,
        cells: s.cells.map((c) => ({
          row: c.row,
          col: c.col,
          type: c.type,
          value: c.value,
          format: c.format ?? undefined,
          bold: c.bold ?? false,
        })),
        tables: s.tables.map((t) => ({
          anchorRow: t.anchorRow,
          anchorCol: t.anchorCol,
          dataset: t.dataset,
          includeHeader: t.includeHeader,
          columns: t.columns
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((col) => ({
              order: col.order,
              header: col.header,
              fieldKey: col.fieldKey,
              format: col.format ?? undefined,
              width: col.width ?? undefined,
            })),
        })),
      }))

    return JSON.stringify(sheets, null, 2)
  }, [template])

  const [jsonText, setJsonText] = useState<string>("")
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // quando carregar template pela primeira vez
  if (detail.isSuccess && template && jsonText === "" && !dirty) {
    // eslint-disable-next-line react/no-unstable-nested-components
    queueMicrotask(() => setJsonText(initialJson))
  }

  async function handleSave() {
    setError(null)

    try {
      const parsed = JSON.parse(jsonText) as ExcelTemplateSheetInput[]

      await updateMut.mutateAsync({
        templateId,
        input: {
          sheets: parsed,
        },
      })

      setDirty(false)
    } catch (e: any) {
      setError(e?.message || "JSON inválido.")
    }
  }

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/excel"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para templates
          </Link>

          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Builder do Template</h1>
            {template ? <Badge variant="secondary">{template.status}</Badge> : null}
            {dirty ? <Badge variant="outline">Alterações não salvas</Badge> : null}
          </div>

          <p className="text-sm text-muted-foreground">
            MVP: edite a estrutura das abas (`sheets`) em JSON. Depois evoluímos para o builder visual.
          </p>
        </div>

        <Button onClick={handleSave} disabled={updateMut.isPending || !dirty}>
          <Save className="mr-2 h-4 w-4" />
          Salvar
        </Button>
      </header>

      {detail.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : !template ? (
        <Card>
          <CardHeader>
            <CardTitle>Template não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Verifique o ID do template ou volte para a lista.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Dica: mantenha `order` consistente e valide `dataset/fieldKey` usando o catálogo.
            </p>
          </CardHeader>

          <CardContent className="space-y-2">
            <Textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value)
                setDirty(true)
              }}
              className="min-h-[520px] font-mono text-xs"
              placeholder="Cole aqui o JSON de sheets..."
            />

            {error ? <p className="text-sm text-destructive">Erro: {error}</p> : null}

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>
                ⚠️ Ao salvar, o backend pode validar colisões/fields — se falhar, ajuste o JSON.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
