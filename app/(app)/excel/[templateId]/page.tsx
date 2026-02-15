import { ExcelTemplateBuilderRoute } from "./components/excel-template-builder-route"

type PageProps = {
  params: Promise<{ templateId: string }>
}

export default async function ExcelTemplateBuilderPageRoute({ params }: PageProps) {
  const { templateId } = await params
  return <ExcelTemplateBuilderRoute templateId={templateId} />
}
