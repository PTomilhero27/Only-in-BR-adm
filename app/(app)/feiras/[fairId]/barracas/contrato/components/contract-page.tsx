"use client"

/**
 * Página: Visualizar/Baixar contrato (A4)
 *
 * ✅ PDF:
 * - html2canvas-pro + jsPDF
 * - Contrato paginado (fatias) + Ficha cadastral em 1 página separada
 *
 * ✅ Upload:
 * - POST /contracts/:contractId/pdf (multipart/form-data)
 *   - file
 *   - fairId
 *   - ownerId
 *   - templateId
 *
 * Ajustes (2026):
 * - Tokens usam purchasesPayments (OwnerFairPurchase)
 * - Data do contrato inclui horário (CONTRACT_DATETIME)
 *
 * Correção de bug:
 * - Paginação “inteligente” do canvas: procura ponto de corte branco
 *   para não “rasgar” títulos/linhas (ex.: CLÁUSULA 20).
 */

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useDocumentTemplateQuery } from "@/app/modules/contratos/document-templates/document-templates.queries"
import { ContractHtml } from "./contract-html"
import { useContractPreview } from "../../context/contract-preview-context"
import { useUploadContractPdfMutation } from "@/app/modules/contratos/assinafy/assinafy.queries"

/* =========================
   Helpers (filename/tokens)
========================= */

function slugifyFilename(s: string) {
  return (s || "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60)
}

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "")
}

function formatMoneyBRL(cents?: number | null) {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0
  return (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatContractDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function replaceTokensAny(input: unknown, tokens: Record<string, string>) {
  if (input == null) return input

  const apply = (s: string) => {
    let out = s
    for (const [k, v] of Object.entries(tokens)) {
      const re = new RegExp(`{{\\s*${escapeRegExp(k)}\\s*}}`, "g")
      out = out.replace(re, v ?? "")
    }
    return out
  }

  if (typeof input === "string") return apply(input)

  try {
    const json = JSON.stringify(input)
    const replaced = apply(json)
    return JSON.parse(replaced)
  } catch {
    return input
  }
}

function formatStallSizeLabel(size?: string | null) {
  switch (size) {
    case "SIZE_2X2":
      return "2x2"
    case "SIZE_3X3":
      return "3x3"
    case "SIZE_3X6":
      return "3x6"
    case "TRAILER":
      return "Trailer"
    default:
      return "—"
  }
}

function derivePurchasesInfo(exhibitorRow: any) {
  const purchases = exhibitorRow?.purchasesPayments
  if (!Array.isArray(purchases) || purchases.length === 0) {
    return {
      sizesSummary: "—",
      purchasesList: "—",
      totalCents: 0,
      paidCents: 0,
    }
  }

  const sizeCount = new Map<string, number>()
  const listItems: string[] = []

  let totalCents = 0
  let paidCents = 0

  for (const p of purchases) {
    const qty = Math.max(1, Number(p?.qty ?? 1))
    const sizeLabel = formatStallSizeLabel(p?.stallSize)
    const unitPriceCents = Math.max(0, Number(p?.unitPriceCents ?? 0))

    totalCents += Math.max(0, Number(p?.totalCents ?? 0))
    paidCents += Math.max(0, Number(p?.paidCents ?? 0))

    sizeCount.set(sizeLabel, (sizeCount.get(sizeLabel) ?? 0) + qty)

    for (let i = 0; i < qty; i++) {
      listItems.push(`${sizeLabel} (${formatMoneyBRL(unitPriceCents)})`)
    }
  }

  const sizesSummary =
    Array.from(sizeCount.entries())
      .map(([label, count]) => `${label}: ${count}`)
      .join(" · ") || "—"

  const purchasesList = listItems.join(" · ") || "—"

  return { sizesSummary, purchasesList, totalCents, paidCents }
}

/* =========================
   PDF helpers (paginação robusta)
========================= */

type PdfOptions = {
  marginMm?: number
  scale?: number
}

async function renderElementToCanvas(el: HTMLElement, scale: number) {
  const { default: html2canvas } = await import("html2canvas-pro")
  return await html2canvas(el, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: el.scrollWidth || 794,
    windowHeight: el.scrollHeight || el.getBoundingClientRect().height,
  })
}

/**
 * Mede “quão branco” é um corte horizontal.
 * Quanto maior, mais provável ser um espaço entre parágrafos.
 */
function rowWhitenessScore(ctx: CanvasRenderingContext2D, y: number, width: number) {
  // lê 1px de altura da linha (barato o suficiente para uma janela pequena)
  const data = ctx.getImageData(0, y, width, 1).data

  // Score: soma de brilho (0..255) por pixel.
  // Branco => score alto; texto => score baixo.
  let score = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    // brilho simples
    score += r + g + b
  }
  return score
}

/**
 * Encontra o melhor ponto de corte próximo ao alvo (targetY),
 * procurando uma linha “mais branca” (espaço entre parágrafos).
 */
function findBestCutY(params: {
  canvas: HTMLCanvasElement
  targetY: number
  searchRadiusPx: number
  minY: number
  maxY: number
}) {
  const { canvas, targetY, searchRadiusPx, minY, maxY } = params
  const ctx = canvas.getContext("2d")
  if (!ctx) return targetY

  const width = canvas.width

  let bestY = targetY
  let bestScore = -Infinity

  const start = Math.max(minY, targetY - searchRadiusPx)
  const end = Math.min(maxY, targetY + searchRadiusPx)

  // varredura simples: escolhe linha com maior “branco”
  for (let y = start; y <= end; y++) {
    const score = rowWhitenessScore(ctx, y, width)

    // pequeno viés: preferir cortes mais próximos do target (evita cortar cedo demais)
    const dist = Math.abs(y - targetY)
    const biasedScore = score - dist * 500 // ajuste fino

    if (biasedScore > bestScore) {
      bestScore = biasedScore
      bestY = y
    }
  }

  return bestY
}

/**
 * Adiciona um canvas ao jsPDF fatiando em páginas A4 sem distorção,
 * agora com “snap para whitespace” para não rasgar títulos/linhas.
 */
function addCanvasAsPagedImages(params: {
  pdf: any
  canvas: HTMLCanvasElement
  marginMm: number
}) {
  const { pdf, canvas, marginMm } = params

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const contentWidthMm = pageWidth - marginMm * 2
  const contentHeightMm = pageHeight - marginMm * 2

  // quantos pixels cabem na altura útil de uma página
  const pxPerMm = canvas.width / contentWidthMm
  const idealSliceHeightPx = Math.round(contentHeightMm * pxPerMm)

  /**
   * Parâmetros do “snap”:
   * - searchRadiusPx: janela onde procuramos um corte mais branco
   * - safetyPaddingPx: evita cortar muito perto do topo (onde títulos são comuns)
   */
  const searchRadiusPx = Math.max(20, Math.round(24 * pxPerMm)) // ~24mm
  const safetyPaddingPx = Math.max(10, Math.round(8 * pxPerMm)) // ~8mm

  let y = 0
  let pageIndex = 0

  while (y < canvas.height) {
    // fim teórico do slice
    const targetEnd = Math.min(y + idealSliceHeightPx, canvas.height)

    // última página: não precisa snap; só pega o restante
    let sliceEnd = targetEnd

    const isLast = targetEnd >= canvas.height
    if (!isLast) {
      // procura ponto de corte melhor (mais branco) perto do targetEnd
      sliceEnd = findBestCutY({
        canvas,
        targetY: targetEnd,
        searchRadiusPx,
        minY: y + safetyPaddingPx, // não corta quase no começo
        maxY: Math.min(canvas.height - 1, targetEnd + searchRadiusPx),
      })

      // garante que sempre avançamos
      if (sliceEnd <= y + safetyPaddingPx) {
        sliceEnd = targetEnd
      }
    }

    const sliceHeight = Math.max(1, sliceEnd - y)

    const sliceCanvas = document.createElement("canvas")
    sliceCanvas.width = canvas.width
    sliceCanvas.height = sliceHeight

    const ctx = sliceCanvas.getContext("2d")
    if (!ctx) break

    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    const imgData = sliceCanvas.toDataURL("image/png")

    if (pageIndex > 0) pdf.addPage()

    // mm calculado com base na largura (mantém proporção)
    const sliceHeightMm = sliceHeight / pxPerMm

    pdf.addImage(imgData, "PNG", marginMm, marginMm, contentWidthMm, sliceHeightMm, undefined, "FAST")

    y += sliceHeight
    pageIndex++
  }
}

/**
 * Adiciona 1 canvas como UMA página (encaixa no A4).
 * Ideal para a ficha cadastral.
 */
function addCanvasAsSinglePageFit(params: { pdf: any; canvas: HTMLCanvasElement; marginMm: number }) {
  const { pdf, canvas, marginMm } = params

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const maxW = pageWidth - marginMm * 2
  const maxH = pageHeight - marginMm * 2

  let w = maxW
  let h = (canvas.height * w) / canvas.width

  if (h > maxH) {
    h = maxH
    w = (canvas.width * h) / canvas.height
  }

  const x = (pageWidth - w) / 2
  const y = (pageHeight - h) / 2

  const imgData = canvas.toDataURL("image/png")

  pdf.addPage()
  pdf.addImage(imgData, "PNG", x, y, w, h, undefined, "FAST")
}

async function buildPdfBlobFromRefs(params: {
  contractEl: HTMLElement
  registrationEl?: HTMLElement | null
  opts?: PdfOptions
}): Promise<Blob> {
  const { contractEl, registrationEl, opts } = params
  const marginMm = opts?.marginMm ?? 10
  const scale = opts?.scale ?? 3

  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })

  // 1) contrato (paginado com snap)
  const contractCanvas = await renderElementToCanvas(contractEl, scale)
  addCanvasAsPagedImages({ pdf, canvas: contractCanvas, marginMm })

  // 2) ficha cadastral (1 página)
  if (registrationEl) {
    const regCanvas = await renderElementToCanvas(registrationEl, scale)
    addCanvasAsSinglePageFit({ pdf, canvas: regCanvas, marginMm })
  }

  const arrayBuffer = pdf.output("arraybuffer")
  return new Blob([arrayBuffer], { type: "application/pdf" })
}

/* =========================
   Page
========================= */

export default function ContractPage() {
  const router = useRouter()
  const { fairId, contractId } = useParams<{ fairId: string; contractId: string }>()

  /**
   * ⚠️ nesta rota, `contractId` está sendo usado como templateId (legado do preview).
   * Mantemos nome claro para não confundir com Contract.id real (instância).
   */
  const templateIdFromRoute = contractId

  const { payload } = useContractPreview()
  const templateQuery = useDocumentTemplateQuery(templateIdFromRoute)

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const contractRef = React.useRef<HTMLDivElement | null>(null)
  const registrationRef = React.useRef<HTMLDivElement | null>(null)

  const [downloading, setDownloading] = React.useState(false)
  const uploadPdfMutation = useUploadContractPdfMutation()

  React.useEffect(() => {
    if (!payload || payload.fairId !== fairId) {
      router.replace(`/feiras/${fairId}/barracas`)
    }
  }, [payload, fairId, router])

  if (!payload || payload.fairId !== fairId) return null

  const row = payload.exhibitor
  const owner = row.owner

  const ownerId = owner?.id
  const templateId = templateIdFromRoute

  const exhibitorName = owner.fullName?.trim() || "Expositor"
  const exhibitorDoc = owner.document || "—"

  const templateTitle =
    (templateQuery.data as any)?.title ??
    (templateQuery.data as any)?.name ??
    "CONTRATO"

  const templateContentRaw =
    (templateQuery.data as any)?.content ??
    (templateQuery.data as any)?.html ??
    (templateQuery.data as any)?.body ??
    (templateQuery.data as any)?.latestVersion?.content ??
    null

  /**
   * ✅ Contract.id real (instância) — usado no upload:
   * POST /contracts/:contractId/pdf
   */
  const contractInstanceId: string | undefined = (row as any)?.contract?.instance?.id ?? undefined

  const tokens = React.useMemo(() => {
    const purchased = Number(row?.stallsQtyPurchased ?? 0)
    const linked = Number(row?.stallsQtyLinked ?? 0)

    const { sizesSummary, purchasesList, totalCents, paidCents } = derivePurchasesInfo(row)

    const fairName = (payload as any)?.fair?.name || (payload as any)?.fairName || "Feira"
    const fairCity = (payload as any)?.fair?.city || (payload as any)?.fairCity || "—"

    const now = new Date()

    return {
      EXHIBITOR_NAME: exhibitorName,
      EXHIBITOR_DOCUMENT: exhibitorDoc,
      EXHIBITOR_EMAIL: owner.email?.trim() || "—",
      EXHIBITOR_PHONE: owner.phone?.trim() || "—",

      FAIR_NAME: fairName,
      FAIR_CITY: fairCity,

      CONTRACT_DATE: formatContractDateTime(now),
      CONTRACT_DATETIME: formatContractDateTime(now),

      STALLS_PURCHASED: String(purchased),
      STALLS_LINKED: String(linked),

      STALLS_SIZES: sizesSummary,
      STALLS_PURCHASES_LIST: purchasesList,
      STALLS_TOTAL_VALUE: formatMoneyBRL(totalCents),
      STALLS_TOTAL_PAID: formatMoneyBRL(paidCents),
    }
  }, [exhibitorName, exhibitorDoc, owner.email, owner.phone, payload, row])

  const contentForRenderer = React.useMemo(() => {
    if (!templateContentRaw) return null
    return replaceTokensAny(templateContentRaw, tokens)
  }, [templateContentRaw, tokens])

  async function downloadPdf() {
    if (!containerRef.current) return
    if (downloading || uploadPdfMutation.isPending) return

    if (!ownerId) {
      alert("ownerId não encontrado no payload. Verifique payload.exhibitor.owner.id")
      return
    }
    if (!fairId) {
      alert("fairId não encontrado na rota.")
      return
    }
    if (!templateId) {
      alert("templateId não encontrado na rota.")
      return
    }

    if (!contentForRenderer) {
      alert("Template sem conteúdo para gerar PDF.")
      return
    }
    if (!contractRef.current) {
      alert("Ref do contrato não encontrado (contractRef).")
      return
    }

    try {
      setDownloading(true)
      document.documentElement.setAttribute("data-pdf-mode", "1")

      await new Promise((r) => requestAnimationFrame(() => r(null)))
      await new Promise((r) => setTimeout(r, 150))
      if ((document as any)?.fonts?.ready) await (document as any).fonts.ready

      const safeDoc = onlyDigits(exhibitorDoc) || "sem_doc"
      const safeName = slugifyFilename(exhibitorName || "expositor")
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
      const filename = `Contrato_${safeName}_${safeDoc}_${stamp}.pdf`

      const pdfBlob = await buildPdfBlobFromRefs({
        contractEl: contractRef.current,
        registrationEl: registrationRef.current,
        opts: { marginMm: 12, scale: 2 },
      })
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" })

      // ✅ Upload novo (contractId real)
      await uploadPdfMutation.mutateAsync({
        input: {
          templateId,
          fairId,
          ownerId,
          ...(contractInstanceId ? { contractId: contractInstanceId } : {}),
          file: pdfFile,
        },
      })


      // download local
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Erro ao gerar/enviar PDF. Veja o console.")
    } finally {
      document.documentElement.removeAttribute("data-pdf-mode")
      setDownloading(false)
    }
  }

  return (
    <main className="relative mx-auto max-w-[850px] bg-white">
      <div data-html2canvas-ignore className="fixed top-6 left-6 z-50">
        <Button type="button" variant="outline" onClick={() => router.push(`/feiras/${fairId}/barracas`)}>
          Voltar
        </Button>
      </div>

      <button
        data-html2canvas-ignore
        onClick={downloadPdf}
        disabled={
          downloading ||
          uploadPdfMutation.isPending ||
          templateQuery.isLoading ||
          !contentForRenderer
        }
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-white shadow-lg hover:bg-orange-600 disabled:opacity-60"
      >
        <Download size={18} />
        {downloading || uploadPdfMutation.isPending ? "Gerando..." : "Baixar PDF"}
      </button>

      <div ref={containerRef} id="contract-preview" className="p-10">
        {templateQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-zinc-500">Carregando contrato…</div>
        ) : templateQuery.isError ? (
          <div className="py-10 text-center text-sm text-zinc-500">
            Não foi possível carregar o contrato do banco.
          </div>
        ) : !contentForRenderer ? (
          <div className="py-10 text-center text-sm text-zinc-500">Template sem conteúdo para renderizar.</div>
        ) : (
          <ContractHtml
            fairId={fairId}
            contractId={contractId}
            exhibitorRow={row}
            templateTitle={templateTitle}
            templateHtml={contentForRenderer}
            showRegistration={true}
            contractRef={contractRef}
            registrationRef={registrationRef}
          />
        )}
      </div>

      <style jsx global>{`
        #contract-preview {
          background: #ffffff;
        }

        html[data-pdf-mode="1"] body,
        html[data-pdf-mode="1"] #contract-preview {
          background: #ffffff !important;
        }
      `}</style>
    </main>
  )
}
