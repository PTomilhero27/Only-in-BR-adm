"use client"

/**
 * ExhibitorRegistrationSheet
 *
 * Responsabilidade:
 * - Renderizar a ficha cadastral do expositor (PDF-ready)
 * - Centralizar regras/formatos da ficha em um único lugar (manutenção fácil)
 *
 * Decisões importantes:
 * - A seção "Compras de barracas" usa o novo modelo financeiro por compra (OwnerFairPurchase),
 *   vindo em `purchasesPayments`.
 * - Para cada compra, exibimos "Tamanho + Valor pago" por barraca comprada.
 *   Como o domínio recomenda 1 compra = 1 barraca (qty=1), isso fica naturalmente correto.
 *   Se qty > 1, fazemos uma alocação determinística do paidCents por unidade.
 */

import * as React from "react"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

/* =========================
   Helpers
========================= */

function formatCpfCnpj(doc?: string) {
  const d = (doc ?? "").replace(/\D/g, "")
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  return doc ?? ""
}

function safeText(v?: string | null) {
  const s = (v ?? "").trim()
  return s ? s : "—"
}

/**
 * Formata centavos para Real (pt-BR).
 * Mantemos esse helper aqui pois a ficha é "PDF-ready" e deve ser estável/isolada.
 */
function formatMoneyBRL(cents?: number | null) {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0
  const value = n / 100
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/**
 * Converte enum do Prisma para label fixo na ficha.
 * Importante: manter padronização (contrato/preview).
 */
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

type PurchasedStallLine = {
  key: string
  stallSizeLabel: string
  paidCents: number
}

/**
 * Expande `purchasesPayments` em "linhas por barraca comprada",
 * exibindo o VALOR DA BARRACA (unitPriceCents) por unidade.
 *
 * Regra:
 * - Para qty=1: uma linha.
 * - Para qty>1: repete a linha qty vezes (uma por barraca comprada).
 */
function buildPurchasedStalls(exhibitorRow: FairExhibitorRow) {
  const purchases = (exhibitorRow as any).purchasesPayments ?? []
  if (!Array.isArray(purchases) || purchases.length === 0) return []

  const lines: Array<{
    key: string
    stallSizeLabel: string
    unitPriceCents: number
  }> = []

  for (const p of purchases) {
    const purchaseId = String(p.purchaseId ?? "")
    const qty = Math.max(1, Number(p.qty ?? 1))
    const unitPriceCents = Math.max(0, Number(p.unitPriceCents ?? 0))

    for (let i = 1; i <= qty; i++) {
      lines.push({
        key: `${purchaseId}:${i}`,
        stallSizeLabel: formatStallSizeLabel(p.stallSize),
        unitPriceCents,
      })
    }
  }

  return lines
}


export type ExhibitorRegistrationSheetProps = {
  exhibitorRow: FairExhibitorRow

  /**
   * Texto abaixo do título (ex.: Only in BR)
   */
  brandLabel?: string

  /**
   * Se você tiver marca/nome fantasia no Owner, passe aqui.
   * (Hoje você estava usando "—")
   */
  brandName?: string
}

export function ExhibitorRegistrationSheet(props: ExhibitorRegistrationSheetProps) {
  const { exhibitorRow, brandLabel = "Only in BR", brandName } = props

  const owner = exhibitorRow.owner
  const isPf = owner.personType === "PF"

  const displayName = safeText(owner.fullName)
  const displayBrandName = safeText(brandName)
  const mainDoc = formatCpfCnpj(owner.document)

  const phone = safeText(owner.phone)
  const email = safeText(owner.email)

  // Observação: no seu payload de exemplo, addressFull não veio.
  // Mantemos leitura defensiva (se o backend já devolver, aparece; se não, fica "—").
  const addressFull = safeText((owner as any).addressFull)

  const bankName = safeText((owner as any).bankName)
  const bankAgency = safeText((owner as any).bankAgency)
  const bankAccount = safeText((owner as any).bankAccount)
  const pixKey = safeText((owner as any).pixKey)

  const purchasedStalls = buildPurchasedStalls(exhibitorRow)

  return (
    <div className="pdf-registration mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="text-center">
        <div className="text-sm font-extrabold tracking-tight text-zinc-900">
          FICHA CADASTRAL DO EXPOSITOR
        </div>
        <div className="mt-1 text-xs font-bold text-zinc-700">{brandLabel}</div>
      </div>

      {/* =========================
          1) Dados do expositor
         ========================= */}
      <div className="mt-6">
        <div className="text-[12px] font-extrabold text-zinc-900">DADOS DO EXPOSITOR</div>

        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <div className="text-[11px] font-medium text-zinc-500">
              {isPf ? "Nome Completo" : "Responsável Legal"}
            </div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
              {displayName}
            </div>
          </div>


          <div>
            <div className="text-[11px] font-medium text-zinc-500">{isPf ? "CPF" : "CNPJ"}</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
              {mainDoc || "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-zinc-500">Telefone / WhatsApp</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
              {phone}
            </div>
          </div>

          <div className="col-span-2">
            <div className="text-[11px] font-medium text-zinc-500">Endereço Completo</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
              {addressFull}
            </div>
          </div>

          <div className="col-span-2">
            <div className="text-[11px] font-medium text-zinc-500">E-mail</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900 break-words">
              {email}
            </div>
          </div>


        </div>
      </div>

      {/* =========================
          2) Compras de barracas
         ========================= */}
<div className="mt-6">
  <div className="text-[12px] font-extrabold text-zinc-900">COMPRAS DE BARRACAS</div>

  {purchasedStalls.length === 0 ? (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-700">
      Nenhuma compra registrada.
    </div>
  ) : (
    <div className="mt-3 space-y-2">
      {purchasedStalls.map((line, idx) => (
        <div
          key={line.key}
          className="grid grid-cols-12 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
        >
          <div className="col-span-1 text-[11px] font-bold text-zinc-700">
            {String(idx + 1).padStart(2, "0")}
          </div>

          <div className="col-span-6">
            <div className="text-[11px] font-medium text-zinc-500">Tamanho</div>
            <div className="mt-0.5 font-semibold text-zinc-900">{line.stallSizeLabel}</div>
          </div>

          <div className="col-span-5 text-right">
            <div className="text-[11px] font-medium text-zinc-500">Valor da barraca</div>
            <div className="mt-0.5 font-semibold text-zinc-900">
              {formatMoneyBRL(line.unitPriceCents)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}

  {/* Resumo opcional */}
  {purchasedStalls.length > 0 ? (
    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
        <div className="text-[11px] font-medium text-zinc-500">Total comprado (qtd.)</div>
        <div className="mt-0.5 font-extrabold text-zinc-900">
          {safeText(String((exhibitorRow as any).stallsQtyPurchased))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-right">
        <div className="text-[11px] font-medium text-zinc-500">Total (agregado)</div>
        <div className="mt-0.5 font-extrabold text-zinc-900">
          {formatMoneyBRL((exhibitorRow as any)?.payment?.totalCents)}
        </div>
      </div>
    </div>
  ) : null}
</div>

      

      {/* =========================
          Dados financeiros para repasse
         ========================= */}
      <div className="mt-6">
        <div className="text-[12px] font-extrabold text-zinc-900">DADOS FINANCEIROS PARA REPASSE</div>

        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[11px] font-medium text-zinc-500">Banco</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
              {bankName}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-zinc-500">Agência</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
              {bankAgency}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-zinc-500">Conta</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900">
              {bankAccount}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-zinc-500">Chave PIX</div>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-semibold text-zinc-900 break-words">
              {pixKey}
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          Declaração / Assinatura
         ========================= */}
      <div className="mt-6 border-t border-zinc-200 pt-4">
        <p className="text-[10.5px] leading-relaxed text-zinc-700">
          Declaro que as informações acima são verdadeiras e completas, responsabilizando-me civil e
          criminalmente por sua veracidade, bem como declaro ciência e concordância com o Contrato de
          Participação.
        </p>

        <div className="mt-3 grid gap-2 text-[11px] text-zinc-800">
          <div>
            <span className="font-bold">Local e Data:</span>{" "}
            _________________________________________________
          </div>
          <div>
            <span className="font-bold">Assinatura do Expositor / Responsável Legal:</span>{" "}
            _________________________________________________
          </div>
        </div>
      </div>
    </div>
  )
}
