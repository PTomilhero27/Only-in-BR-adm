import * as React from "react"
import { Input } from "@/components/ui/input"

/**
 * Input monetário robusto:
 * - aceita números + vírgula
 * - mostra milhar enquanto digita
 * - mantém centavos digitados
 * - formata corretamente no blur
 *
 * Internamente salva SEMPRE em centavos (number).
 */
export const UnitPriceInput = React.memo(function UnitPriceInput(props: {
  valueCents: number
  disabled?: boolean
  onChangeCents: (cents: number) => void
}) {
  const { valueCents, disabled, onChangeCents } = props

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const isFocusedRef = React.useRef(false)

  function formatFromCents(cents: number) {
    const v = (Number.isFinite(cents) ? cents : 0) / 100
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function parseTextToCents(text: string): number {
    const raw = text
      .replace(/\./g, "") // remove milhar
      .replace(",", ".")  // vírgula → decimal
      .replace(/[^\d.]/g, "")

    const num = Number(raw)
    if (!Number.isFinite(num)) return 0

    return Math.round(num * 100)
  }

  function formatWhileTyping(text: string): string {
    // mantém só números e vírgula
    let clean = text.replace(/[^\d,]/g, "")

    const hasComma = clean.includes(",")
    let [intPart, decPart = ""] = clean.split(",")

    // formata milhar
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

    if (hasComma) {
      decPart = decPart.slice(0, 2) // máx 2 casas
      return `${intPart},${decPart}`
    }

    return intPart
  }

  // sincroniza quando pai muda, sem quebrar foco
  React.useEffect(() => {
    if (isFocusedRef.current) return
    if (inputRef.current) {
      inputRef.current.value = formatFromCents(valueCents)
    }
  }, [valueCents])

  return (
    <div className="relative">

      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={formatFromCents(valueCents)}
        disabled={disabled}
        onFocus={() => {
          isFocusedRef.current = true
        }}
        onChange={() => {
          const el = inputRef.current
          if (!el) return

          const formatted = formatWhileTyping(el.value)
          el.value = formatted

          const cents = parseTextToCents(formatted)
          onChangeCents(cents)
        }}
        onBlur={() => {
          isFocusedRef.current = false
          const el = inputRef.current
          if (!el) return

          const cents = parseTextToCents(el.value)
          el.value = formatFromCents(cents)
          onChangeCents(cents)
        }}
      />
    </div>
  )
})
