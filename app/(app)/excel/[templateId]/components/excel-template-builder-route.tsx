"use client"

import { ExcelTemplateBuilderSheet } from "./excel-template-builder-sheet"

export function ExcelTemplateBuilderRoute({ templateId }: { templateId: string }) {
  return <ExcelTemplateBuilderSheet templateId={templateId} />
}
