import type { AvailableStallFair } from "@/app/modules/fair-maps/fair-maps.schema"
import {
  StallSizeSchema,
  type StallSize,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import type {
  ConfirmMarketplaceReservationInput,
  MarketplaceReservation,
} from "@/app/modules/marketplace/marketplace.schema"

export type ConfirmReservationUnitPriceMode = "reservation" | "custom"

export type ConfirmReservationInstallmentForm = {
  clientId: string
  number: number
  dueDate: string
  amountCents: number
  paidAt?: string | null
  paidAmountCents?: number | null
}

export type ConfirmReservationFormState = {
  stallId: string
  unitPriceMode: ConfirmReservationUnitPriceMode
  unitPriceCents: number
  paidCents: number
  installmentsCount: number
  installments: ConfirmReservationInstallmentForm[]
}

export type ReservationLinkedStall = {
  stallId: string
  stallName: string
  stallSize: StallSize | null
  ownerName: string | null
}

export type ReservationStallOption = ReservationLinkedStall & {
  stallFairId: string | null
  ownerPhone: string | null
  searchText: string
}

type RecordLike = Record<string, unknown>

export function makeClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function todayISODateOnly() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}`
}

export function formatCurrency(cents?: number | null) {
  if (!Number.isFinite(cents)) return "Nao informado"
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function formatDateTime(value?: string | null) {
  if (!value) return null

  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeCents(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}

function normalizeStallSize(value: unknown): StallSize | null {
  const result = StallSizeSchema.safeParse(value)
  return result.success ? result.data : null
}

export function splitCentsEven(totalCents: number, count: number) {
  const safeCount = Math.max(1, count)
  const base = Math.floor(totalCents / safeCount)
  const remainder = totalCents - base * safeCount

  return Array.from({ length: safeCount }, (_, index) =>
    base + (index < remainder ? 1 : 0),
  )
}

export function getReservationCapturedPriceCents(
  reservation: MarketplaceReservation | null,
) {
  if (!reservation) return null

  const directPrice = normalizeCents(reservation.priceCents)
  if (directPrice !== null) return directPrice

  const selectedTentType = reservation.selectedTentType ?? null
  const fairMapSlot = reservation.fairMapSlot as RecordLike | undefined
  const allowedTentTypes = Array.isArray(fairMapSlot?.allowedTentTypes)
    ? (fairMapSlot?.allowedTentTypes as Array<RecordLike>)
    : []

  if (selectedTentType) {
    const matchedTentType = allowedTentTypes.find(
      (item) => item?.tentType === selectedTentType,
    )
    const tentTypePrice = normalizeCents(matchedTentType?.priceCents)
    if (tentTypePrice !== null) return tentTypePrice
  }

  return normalizeCents(fairMapSlot?.priceCents)
}

export function getReservationLinkedStall(
  reservation: MarketplaceReservation | null,
): ReservationLinkedStall | null {
  if (!reservation) return null

  const rawReservation = reservation as RecordLike
  const nestedStall =
    (rawReservation.stall as RecordLike | null | undefined) ??
    ((rawReservation.stallFair as RecordLike | null | undefined)?.stall as
      | RecordLike
      | null
      | undefined) ??
    (rawReservation.linkedStall as RecordLike | null | undefined) ??
    null

  const stallId =
    normalizeString(rawReservation.stallId) ??
    normalizeString(nestedStall?.stallId) ??
    normalizeString(nestedStall?.id)

  const stallName =
    normalizeString(rawReservation.stallName) ??
    normalizeString(rawReservation.stallPdvName) ??
    normalizeString(nestedStall?.pdvName) ??
    normalizeString(nestedStall?.name)

  const stallSize =
    normalizeStallSize(rawReservation.stallSize) ??
    normalizeStallSize(nestedStall?.stallSize)

  const ownerName =
    normalizeString(rawReservation.stallOwnerName) ??
    normalizeString(nestedStall?.ownerName)

  if (!stallId && !stallName) return null

  return {
    stallId: stallId ?? "",
    stallName: stallName ?? "Barraca vinculada",
    stallSize,
    ownerName,
  }
}

export function mapAvailableStallToOption(
  availableStall: AvailableStallFair,
): ReservationStallOption | null {
  const raw = availableStall as RecordLike

  const stallId =
    normalizeString(raw.stallId) ??
    normalizeString((raw.stall as RecordLike | null | undefined)?.id) ??
    normalizeString((raw.stallFair as RecordLike | null | undefined)?.stallId)

  if (!stallId) return null

  const stallFairId =
    normalizeString(raw.stallFairId) ?? normalizeString(raw.id) ?? null
  const stallName =
    normalizeString(raw.stallPdvName) ??
    normalizeString(raw.stallName) ??
    normalizeString((raw.stall as RecordLike | null | undefined)?.pdvName) ??
    normalizeString((raw.stall as RecordLike | null | undefined)?.name) ??
    "Barraca"

  const stallSize =
    normalizeStallSize(raw.stallSize) ??
    normalizeStallSize((raw.stall as RecordLike | null | undefined)?.stallSize)

  const ownerName = normalizeString(raw.ownerName)
  const ownerPhone = normalizeString(raw.ownerPhone)

  return {
    stallId,
    stallFairId,
    stallName,
    stallSize,
    ownerName,
    ownerPhone,
    searchText: [
      stallName,
      ownerName,
      ownerPhone,
      stallSize,
      stallFairId,
      stallId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }
}

export function buildReservationStallOptions(
  availableStalls: AvailableStallFair[],
  linkedStall: ReservationLinkedStall | null,
) {
  const options = availableStalls
    .map(mapAvailableStallToOption)
    .filter((value): value is ReservationStallOption => Boolean(value))

  if (
    linkedStall?.stallId &&
    !options.some((item) => item.stallId === linkedStall.stallId)
  ) {
    options.unshift({
      ...linkedStall,
      stallFairId: null,
      ownerPhone: null,
      searchText: [
        linkedStall.stallName,
        linkedStall.ownerName,
        linkedStall.stallSize,
        linkedStall.stallId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    })
  }

  return options
}

export function filterCompatibleStallOptions(
  options: ReservationStallOption[],
  selectedTentType: StallSize | null | undefined,
) {
  if (!selectedTentType) return options

  return options.filter(
    (option) => option.stallSize === null || option.stallSize === selectedTentType,
  )
}

export function reconcileInstallments(params: {
  remainingCents: number
  installmentsCount: number
  current?: ConfirmReservationInstallmentForm[]
}) {
  const count = Math.max(0, Math.min(12, params.installmentsCount || 0))
  if (params.remainingCents <= 0 || count === 0) return []

  const amounts = splitCentsEven(params.remainingCents, count)
  const currentMap = new Map<number, ConfirmReservationInstallmentForm>()

  for (const installment of params.current ?? []) {
    currentMap.set(installment.number, installment)
  }

  return amounts.map((amountCents, index) => {
    const number = index + 1
    const previous = currentMap.get(number)

    return {
      clientId: previous?.clientId ?? makeClientId(),
      number,
      dueDate: previous?.dueDate ?? todayISODateOnly(),
      amountCents,
      paidAt: previous?.paidAt ?? null,
      paidAmountCents: previous?.paidAmountCents ?? null,
    }
  })
}

export function buildInitialConfirmReservationForm(
  reservation: MarketplaceReservation | null,
): ConfirmReservationFormState {
  const linkedStall = getReservationLinkedStall(reservation)
  const capturedPriceCents = getReservationCapturedPriceCents(reservation)
  const unitPriceMode: ConfirmReservationUnitPriceMode =
    capturedPriceCents === null ? "custom" : "reservation"

  const unitPriceCents = capturedPriceCents ?? 0
  const paidCents = 0
  const remainingCents = Math.max(0, unitPriceCents - paidCents)
  const installmentsCount = remainingCents > 0 ? 1 : 0

  return {
    stallId: linkedStall?.stallId ?? "",
    unitPriceMode,
    unitPriceCents,
    paidCents,
    installmentsCount,
    installments: reconcileInstallments({
      remainingCents,
      installmentsCount,
    }),
  }
}

export function getEffectiveUnitPriceCents(
  reservation: MarketplaceReservation | null,
  form: ConfirmReservationFormState,
) {
  if (!reservation) return null

  if (form.unitPriceMode === "custom") {
    return Math.max(0, Number(form.unitPriceCents) || 0)
  }

  return getReservationCapturedPriceCents(reservation)
}

export function getRemainingCents(
  reservation: MarketplaceReservation | null,
  form: ConfirmReservationFormState,
) {
  const effectiveUnitPriceCents = getEffectiveUnitPriceCents(reservation, form)
  if (effectiveUnitPriceCents === null) return 0

  return Math.max(0, effectiveUnitPriceCents - Math.max(0, form.paidCents || 0))
}

export function validateConfirmReservationForm(params: {
  reservation: MarketplaceReservation | null
  form: ConfirmReservationFormState
  selectedStall: ReservationLinkedStall | null
}) {
  const { reservation, form, selectedStall } = params

  if (!reservation) return "Selecione uma reserva para continuar."

  const effectiveUnitPriceCents = getEffectiveUnitPriceCents(reservation, form)
  if (effectiveUnitPriceCents === null) {
    return "Informe o valor unitario para continuar."
  }

  if (!Number.isInteger(form.paidCents) || form.paidCents < 0) {
    return "O valor pago deve ser um numero valido."
  }

  if (form.paidCents > effectiveUnitPriceCents) {
    return "O valor pago nao pode ser maior que o valor da reserva."
  }

  const selectedTentType = reservation.selectedTentType ?? null
  if (
    form.stallId.trim() &&
    selectedTentType &&
    selectedStall?.stallSize &&
    selectedStall.stallSize !== selectedTentType
  ) {
    return "A barraca selecionada nao e compativel com o tipo reservado."
  }

  const remainingCents = getRemainingCents(reservation, form)
  if (remainingCents === 0) return null

  if (
    !Number.isInteger(form.installmentsCount) ||
    form.installmentsCount < 1 ||
    form.installmentsCount > 12
  ) {
    return "Informe em quantas parcelas o restante sera pago (1-12)."
  }

  if (!Array.isArray(form.installments) || form.installments.length !== form.installmentsCount) {
    return "A lista de parcelas nao confere com a quantidade informada."
  }

  const sum = form.installments.reduce(
    (acc, installment) => acc + (installment.amountCents ?? 0),
    0,
  )

  if (sum !== remainingCents) {
    return "A soma das parcelas deve ser igual ao restante em aberto."
  }

  for (const installment of form.installments) {
    if (!installment.dueDate) {
      return "Informe a data de vencimento de todas as parcelas."
    }

    if (!Number.isInteger(installment.amountCents) || installment.amountCents < 0) {
      return "Os valores das parcelas precisam ser validos."
    }
  }

  return null
}

export function buildConfirmReservationPayload(params: {
  reservation: MarketplaceReservation
  form: ConfirmReservationFormState
}): ConfirmMarketplaceReservationInput {
  const { reservation, form } = params
  const effectiveUnitPriceCents = getEffectiveUnitPriceCents(reservation, form)

  if (effectiveUnitPriceCents === null) {
    throw new Error("Nao foi possivel calcular o valor da reserva.")
  }

  const remainingCents = getRemainingCents(reservation, form)
  const payload: ConfirmMarketplaceReservationInput = {}
  const trimmedStallId = form.stallId.trim()

  if (trimmedStallId) {
    payload.stallId = trimmedStallId
  }

  if (form.unitPriceMode === "custom") {
    payload.unitPriceCents = effectiveUnitPriceCents
  }

  payload.paidCents = Math.max(0, form.paidCents)

  if (remainingCents > 0) {
    payload.installmentsCount = form.installmentsCount
    payload.installments = form.installments.map((installment) => ({
      number: installment.number,
      dueDate: installment.dueDate,
      amountCents: installment.amountCents,
      paidAt: installment.paidAt ?? undefined,
      paidAmountCents: installment.paidAmountCents ?? undefined,
    }))
  } else {
    payload.installmentsCount = 0
  }

  return payload
}
