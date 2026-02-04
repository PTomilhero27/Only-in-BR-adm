"use client"

/**
 * ContractHtml
 *
 * - Renderiza contrato (HTML ou JSON Tiptap)
 * - Renderiza ficha cadastral em "bloco separado"
 * - Expõe refs para capturar cada parte separadamente no PDF
 */

import * as React from "react"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import { ExhibitorRegistrationSheet } from "./exhibitor-registration-sheet"

/* =========================
   Helpers
========================= */

function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

type TipTapDoc = { type: "doc"; content?: any[] }

type ContractBlock =
  | { id: string; type: "freeText"; order: number; richText: TipTapDoc }
  | {
      id: string
      type: "clause"
      order: number
      title?: string
      items?: { id: string; number?: string; richText: TipTapDoc }[]
    }

type ContractPayload = {
  version?: number
  blocks?: ContractBlock[]
}

function isContractPayload(v: unknown): v is ContractPayload {
  return !!v && typeof v === "object" && Array.isArray((v as any).blocks)
}

function toHtmlFromTipTapDoc(doc: any) {
  try {
    if (!doc || typeof doc !== "object") return ""
    return generateHTML(doc, [StarterKit])
  } catch {
    return `<p>${escapeHtml(String(doc ?? ""))}</p>`
  }
}

function renderContractBlocksToHtml(payload: ContractPayload) {
  const blocks = payload.blocks ?? []
  const sorted = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const parts: string[] = []

  for (const block of sorted) {
    if (!block) continue

    if (block.type === "freeText") {
      const contentHtml = toHtmlFromTipTapDoc((block as any).richText)
      parts.push(`<section class="contract-block contract-freeText">${contentHtml}</section>`)
      continue
    }

    if (block.type === "clause") {
      const title = (block as any).title ? escapeHtml(String((block as any).title)) : ""
      const items = Array.isArray((block as any).items) ? (block as any).items : []

      parts.push(`<section class="contract-block contract-clause">`)

      if (title) parts.push(`<h2 class="contract-clause-title">${title}</h2>`)

      parts.push(`<div class="contract-clause-items">`)
      for (const it of items) {
        const number = it?.number ? escapeHtml(String(it.number)) : ""
        const itemHtml = toHtmlFromTipTapDoc(it?.richText)

        parts.push(`<div class="contract-clause-item">`)
        parts.push(`<div class="contract-clause-number">${number || ""}</div>`)
        parts.push(`<div class="contract-clause-body">${itemHtml}</div>`)
        parts.push(`</div>`)
      }
      parts.push(`</div></section>`)
      continue
    }
  }

  return parts.join("\n")
}

function toContractHtml(input: unknown) {
  if (typeof input === "string") {
    const trimmed = input.trim()

    if (trimmed && (trimmed.startsWith("{") || trimmed.startsWith("["))) {
      try {
        const parsed = JSON.parse(trimmed)
        if (isContractPayload(parsed)) return renderContractBlocksToHtml(parsed)
      } catch {
        // segue como HTML puro
      }
    }

    return input
  }

  if (isContractPayload(input)) return renderContractBlocksToHtml(input)

  return `<p>${escapeHtml(String(input ?? ""))}</p>`
}

/* =========================
   Component
========================= */

export function ContractHtml(props: {
  contractId: string
  fairId: string

  templateTitle?: string
  templateHtml: unknown // string OU JSON

  exhibitorRow: FairExhibitorRow
  showRegistration: boolean

  // ✅ CORREÇÃO: aceitar ref com null
  contractRef?: React.RefObject<HTMLDivElement | null>
  registrationRef?: React.RefObject<HTMLDivElement | null>

  registrationBrandLabel?: string
  registrationBrandName?: string
}) {
  const {
    templateTitle,
    templateHtml,
    exhibitorRow,
    showRegistration,
    contractRef,
    registrationRef,
    registrationBrandLabel,
    registrationBrandName,
  } = props

  const contractHtml = React.useMemo(() => toContractHtml(templateHtml), [templateHtml])

  return (
    <div className="doc">
      {/* =====================
          PARTE 1: CONTRATO
         ===================== */}
      <div ref={contractRef} className="pdf-contract">
        <div className="tiptap prose prose-sm max-w-none leading-relaxed">
          {templateTitle ? (
            <div className="mb-4 text-center">
              <div className="text-lg font-extrabold text-zinc-900 uppercase">{templateTitle}</div>
            </div>
          ) : null}

          <style>{`
            .contract-block { margin-bottom: 18px; }

            .contract-clause-title {
              text-align: left;
              margin: 18px 0 10px;
              font-weight: 900;
              letter-spacing: 0.02em;
            }

            .contract-clause-items { display: grid; gap: 8px; }

            .contract-clause-item {
              display: grid;
              grid-template-columns: 42px 1fr;
              gap: 0px;
              align-items: start;
            }

            .contract-clause-number {
              font-weight: 900;
              color: rgb(24 24 27);
              line-height: 1.35;
              padding-top: 2px;
            }

            .contract-clause-body { line-height: 1.55; }
            .contract-clause-body p { margin: 0; }
            .contract-freeText p { margin: 0 0 8px; }

            .doc .contract-block ul,
            .doc .contract-block ol {
              margin: 8px 0 8px;
              padding-left: 18px;
              list-style-position: outside;
            }

            .doc .contract-block ul { list-style-type: disc; }
            .doc .contract-block ol { list-style-type: decimal; }
            .doc .contract-block li { margin: 0 0 6px; }
            .doc .contract-block li > p { margin: 0; }

            .doc .contract-block hr { margin: 14px 0; border-color: #e5e7eb; }

            /* evita quebrar item no meio (ajuda um pouco no layout antes do canvas) */
            .doc .contract-block li,
            .contract-clause-item { break-inside: avoid; page-break-inside: avoid; }
          `}</style>

          <div dangerouslySetInnerHTML={{ __html: contractHtml }} />
        </div>
      </div>

      {/* =====================
          PARTE 2: FICHA CADASTRAL
          (capturada em 1 página separada)
         ===================== */}
      {showRegistration && (
        <div ref={registrationRef} className="pdf-registration mt-6">
          <ExhibitorRegistrationSheet
            exhibitorRow={exhibitorRow}
            brandLabel={registrationBrandLabel ?? "Only in BR"}
            brandName={registrationBrandName}
          />
        </div>
      )}
    </div>
  )
}
