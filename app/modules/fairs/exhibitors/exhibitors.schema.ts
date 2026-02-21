/**
 * Contratos do módulo "fairs/exhibitors" (painel admin).
 * Motivo: validar payload com Zod e evitar contratos implícitos.
 *
 * ✅ Atualizado:
 * - Fair agora inclui `taxes[]` (catálogo da feira)
 * - ✅ FIX REAL (payload): linkedStalls NÃO é Stall “puro”; é StallFair (com `stall` nested)
 *   - Agora o schema aceita:
 *     (A) formato antigo “flattened” (stall + stallFairId/tax/slot no topo) e
 *     (B) formato novo “stallFair” (stallFairId/stallId/slot/tax/stall/purchase)
 *   - E normaliza para o formato FLATTENED que a UI já espera (sem você ter que refatorar tudo).
 * - stallFairs inclui `tax` (snapshot) + `slot`
 * - MapSlot.number agora é `nullable().optional()` (backend pode omitir number)
 *
 * ✅ Ajustes de robustez (para não quebrar o Zod):
 * - `isComplete` e `contract` viraram opcionais (alguns payloads não enviam)
 */

import { z } from "zod"

/** =========================
 * Helpers de datas
 * ========================= */

/**
 * Date-only (YYYY-MM-DD) usado para vencimento/pagamento em telas administrativas,
 * evitando bugs de timezone (o backend normaliza para 00:00Z).
 */
export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD.")
export type DateOnly = z.infer<typeof DateOnlySchema>

/** =========================
 * ENUMS (domínio)
 * ========================= */

export const OwnerFairStatusSchema = z.enum([
  "SELECIONADO",
  "AGUARDANDO_PAGAMENTO",
  "AGUARDANDO_ASSINATURA",
  "AGUARDANDO_BARRACAS",
  "CONCLUIDO",
])
export type OwnerFairStatus = z.infer<typeof OwnerFairStatusSchema>

export const OwnerFairPaymentStatusSchema = z.enum([
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
])
export type OwnerFairPaymentStatus = z.infer<typeof OwnerFairPaymentStatusSchema>

export const StallSizeSchema = z.enum([
  "SIZE_2X2",
  "SIZE_3X3",
  "SIZE_3X6",
  "TRAILER",
  "CART",
])
export type StallSize = z.infer<typeof StallSizeSchema>

export const StallTypeSchema = z.enum(["OPEN", "CLOSED", "TRAILER", "CART"])
export type StallType = z.infer<typeof StallTypeSchema>

export const ContractTemplateStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
])
export type ContractTemplateStatus = z.infer<typeof ContractTemplateStatusSchema>

export const BankAccountTypeSchema = z.enum([
  "CORRENTE",
  "POUPANCA",
  "PAGAMENTO",
])
export type BankAccountType = z.infer<typeof BankAccountTypeSchema>

/** =========================
 * FAIR TAX (catálogo / snapshot)
 * ========================= */

/**
 * Taxa configurada na feira (catálogo).
 * Importante:
 * - percentBps em basis points (500 = 5.00%)
 */
export const FairTaxSchema = z.object({
  id: z.string(),
  name: z.string(),
  percentBps: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type FairTax = z.infer<typeof FairTaxSchema>

/**
 * Snapshot da taxa aplicada em uma barraca (ou referência da mesma).
 * Observação:
 * - `id` aqui é o taxId
 * - name/percentBps vêm do snapshot (ou fallback do catálogo, mas a UI trata como snapshot)
 */
export const AppliedTaxSnapshotSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  percentBps: z.number().int().nullable().optional(),
  isActive: z.boolean().nullable().optional(),
})
export type AppliedTaxSnapshot = z.infer<typeof AppliedTaxSnapshotSchema>

/** =========================
 * MAP SLOT (operacional)
 * ========================= */

/**
 * Slot do Mapa 2D vinculado à barraca (quando existir).
 * - clientKey: chave estável do elemento BOOTH_SLOT (usada no vínculo)
 * - number: número exibido visualmente no mapa (o que a UI mostra)
 */
export const MapSlotSchema = z.object({
  clientKey: z.string(),
  number: z.number().int().nullable().optional(), // ✅ robustez (pode vir omitido)
})
export type MapSlot = z.infer<typeof MapSlotSchema>

/** =========================
 * OWNER / EXHIBITOR (linha)
 * ========================= */

export const FairExhibitorOwnerSchema = z.object({
  id: z.string(),
  personType: z.enum(["PF", "PJ"]),
  document: z.string(),

  fullName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),

  // ✅ Endereço
  addressFull: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZipcode: z.string().nullable().optional(),
  addressNumber: z.string().nullable().optional(),

  // ✅ Pagamento
  pixKey: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankAccountType: BankAccountTypeSchema.nullable().optional(),

  bankHolderDoc: z.string().nullable().optional(),
  bankHolderName: z.string().nullable().optional(),

  // ✅ Extra
  stallsDescription: z.string().nullable().optional(),
})
export type FairExhibitorOwner = z.infer<typeof FairExhibitorOwnerSchema>

/** =========================
 * STALL (detalhe)
 * ========================= */

export const FairLinkedStallSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  pdvName: z.string(),
  stallType: StallTypeSchema,
  stallSize: StallSizeSchema,
  machinesQty: z.number(),
  bannerName: z.string().nullable().optional(),
  mainCategory: z.string().nullable().optional(),
  teamQty: z.number(),
})
export type FairLinkedStall = z.infer<typeof FairLinkedStallSchema>

export const FairConsumedPurchaseSchema = z.object({
  id: z.string(),
  stallSize: StallSizeSchema,
  unitPriceCents: z.number(),
  qty: z.number(),
  usedQty: z.number(),
  status: OwnerFairPaymentStatusSchema,
})
export type FairConsumedPurchase = z.infer<typeof FairConsumedPurchaseSchema>

/**
 * Formato “real” do backend: linkedStalls/stallFairs como StallFair com nested stall
 */
export const FairStallFairItemSchema = z.object({
  stallFairId: z.string(),
  stallId: z.string(),
  createdAt: z.string().datetime(),

  slot: MapSlotSchema.nullable().optional(),
  tax: AppliedTaxSnapshotSchema.nullable().optional(),

  stall: FairLinkedStallSchema,
  purchase: FairConsumedPurchaseSchema.nullable(),
})
export type FairStallFairItem = z.infer<typeof FairStallFairItemSchema>

/**
 * ✅ Formato FLATTENED (o que sua UI já espera usar em várias telas)
 */
export const FairLinkedStallWithFairContextSchema = FairLinkedStallSchema.extend({
  stallFairId: z.string(),
  tax: AppliedTaxSnapshotSchema.nullable().optional(),
  slot: MapSlotSchema.nullable().optional(),
})
export type FairLinkedStallWithFairContext = z.infer<
  typeof FairLinkedStallWithFairContextSchema
>

/**
 * ✅ FIX PRINCIPAL:
 * `linkedStalls` pode vir em DOIS formatos:
 * - antigo (flattened)
 * - novo (stallFair item com nested stall)
 *
 * Este schema aceita ambos e NORMALIZA para o formato flattened.
 */
export const FairLinkedStallWithFairContextInputSchema = z
  .union([FairLinkedStallWithFairContextSchema, FairStallFairItemSchema])
  .transform((v): FairLinkedStallWithFairContext => {
    // já veio flattened
    if ("pdvName" in v) return v as FairLinkedStallWithFairContext

    // veio stallFair item -> achata
    return {
      ...v.stall,
      stallFairId: v.stallFairId,
      tax: v.tax ?? null,
      slot: v.slot ?? null,
    }
  })

/** =========================
 * PAYMENTS (por compra)
 * ========================= */

export const PurchaseInstallmentSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountCents: z.number().int().nonnegative(),

  paidAt: z.string().datetime().nullable(),
  paidAmountCents: z.number().int().nonnegative().nullable(),
})
export type PurchaseInstallment = z.infer<typeof PurchaseInstallmentSchema>

export const PurchasePaymentSummarySchema = z.object({
  purchaseId: z.string(),
  stallSize: StallSizeSchema,
  qty: z.number(),
  usedQty: z.number(),

  unitPriceCents: z.number(),
  totalCents: z.number(),

  paidCents: z.number(),
  paidAt: z.string().datetime().nullable(),

  status: OwnerFairPaymentStatusSchema,

  installmentsCount: z.number(),
  paidCount: z.number(),
  overdueCount: z.number(),
  nextDueDate: z.string().datetime().nullable(),

  installments: z.array(PurchaseInstallmentSchema),
})
export type PurchasePaymentSummary = z.infer<typeof PurchasePaymentSummarySchema>

export const AggregatedPaymentSchema = z.object({
  status: OwnerFairPaymentStatusSchema,
  totalCents: z.number(),
  paidCents: z.number(),
  purchasesCount: z.number(),
})
export type AggregatedPayment = z.infer<typeof AggregatedPaymentSchema>

/** =========================
 * CONTRACT SETTINGS (fair)
 * ========================= */

export const FairContractSettingsSchema = z
  .object({
    id: z.string(),
    templateId: z.string(),
    updatedAt: z.string().datetime(),
    updatedByUserId: z.string().nullable().optional(),
    template: z.object({
      id: z.string(),
      title: z.string(),
      status: ContractTemplateStatusSchema,
      isAddendum: z.boolean(),
      updatedAt: z.string().datetime(),
    }),
  })
  .nullable()
export type FairContractSettings = z.infer<typeof FairContractSettingsSchema>

/** =========================
 * CONTRACT (item/exhibitor)
 * ========================= */

export const FairContractInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  addendumTemplateId: z.string().nullable(),

  pdfPath: z.string().nullable(),

  assinafyDocumentId: z.string().nullable(),
  assinafySignerId: z.string().nullable().optional(),

  signUrl: z.string().url().nullable().optional(),
  signUrlExpiresAt: z.string().datetime().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type FairContractInstance = z.infer<typeof FairContractInstanceSchema>

export const FairAddendumChoiceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  templateTitle: z.string().nullable(),
  templateStatus: ContractTemplateStatusSchema.nullable(),
  templateVersionNumber: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type FairAddendumChoice = z.infer<typeof FairAddendumChoiceSchema>

export const FairExhibitorContractSchema = z.object({
  fairTemplate: z
    .object({
      id: z.string(),
      title: z.string(),
      status: ContractTemplateStatusSchema,
      updatedAt: z.string().datetime(),
    })
    .nullable(),

  instance: FairContractInstanceSchema.nullable(),
  addendumChoice: FairAddendumChoiceSchema.nullable(),

  signedAt: z.string().datetime().nullable(),

  signUrl: z.string().url().nullable(),
  signUrlExpiresAt: z.string().datetime().nullable().optional(),

  hasPdf: z.boolean(),
  hasContractInstance: z.boolean(),
})
export type FairExhibitorContract = z.infer<typeof FairExhibitorContractSchema>

/** =========================
 * ROW (exhibitor)
 * ========================= */

export const FairExhibitorRowSchema = z.object({
  ownerFairId: z.string(),
  fairId: z.string(),
  owner: FairExhibitorOwnerSchema,

  stallsQtyPurchased: z.number(),
  stallsQtyLinked: z.number(),

  /**
   * ✅ FIX:
   * linkedStalls agora aceita o payload REAL (stallFair com nested stall)
   * e transforma para o formato flattened (o que você já usa na UI).
   */
  linkedStalls: z.array(FairLinkedStallWithFairContextInputSchema),

  status: OwnerFairStatusSchema,

  // ✅ robustez: alguns payloads não mandam isso
  isComplete: z.boolean().optional(),

  contractSignedAt: z.string().datetime().nullable(),

  observations: z.string().nullable().optional(),

  payment: AggregatedPaymentSchema,
  purchasesPayments: z.array(PurchasePaymentSummarySchema),

  // ✅ já é StallFair “real”
  stallFairs: z.array(FairStallFairItemSchema),

  // ✅ robustez: alguns payloads não mandam isso
  contract: FairExhibitorContractSchema.optional(),
})
export type FairExhibitorRow = z.infer<typeof FairExhibitorRowSchema>

/** =========================
 * MAP TEMPLATE + FAIR MAP (operacional)
 * ========================= */

/**
 * Tipos de elementos do template.
 * Deve bater com o enum `MapElementType` do Prisma.
 */
export const MapElementTypeSchema = z.enum([
  "BOOTH_SLOT",
  "RECT",
  "SQUARE",
  "LINE",
  "TEXT",
  "TREE",
])
export type MapElementType = z.infer<typeof MapElementTypeSchema>

/**
 * Elemento do template (MapTemplateElement do Prisma).
 * Mantemos tolerante a payload parcial (principalmente style/isLinkable/rotation).
 */
export const MapTemplateElementSchema = z.object({
  id: z.string(),
  clientKey: z.string(),
  type: MapElementTypeSchema,

  x: z.number(),
  y: z.number(),

  rotation: z.number().optional().default(0),

  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),

  label: z.string().nullable().optional(),
  number: z.number().int().nullable().optional(),

  points: z.unknown().nullable().optional(),
  radius: z.number().nullable().optional(),

  style: z.unknown().optional().default({}),
  isLinkable: z.boolean().optional().default(false),
})
export type MapTemplateElement = z.infer<typeof MapTemplateElementSchema>

/**
 * Template do mapa (MapTemplate do Prisma).
 * ⚠️ Para não quebrar com selects parciais, deixamos alguns campos opcionais.
 * Mas `id` + `elements` são o mínimo que a UI precisa.
 */
export const MapTemplateSchema = z.object({
  id: z.string(),

  title: z.string().optional().default("Template"),

  description: z.string().nullable().optional(),
  backgroundUrl: z.string().nullable().optional(),

  worldWidth: z.number().int().optional(),
  worldHeight: z.number().int().optional(),

  version: z.number().int().optional(),

  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),

  elements: z.array(MapTemplateElementSchema).optional().default([]),
})
export type MapTemplate = z.infer<typeof MapTemplateSchema>

// ✅ fallback tipado (evita `never[]` e evita erro do TS no .default)
const MAP_TEMPLATE_FALLBACK: MapTemplate = {
  id: "template",
  title: "Template",
  elements: [],
}

/**
 * Link operacional: BOOTH_SLOT ↔ StallFair
 * - `slotNumber` é derivado do template (quando existir)
 */
export const FairMapLinkSchema = z.object({
  id: z.string().optional(),
  stallFairId: z.string(),
  slotClientKey: z.string(),
  slotNumber: z.number().int().nullable().optional(),

  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})
export type FairMapLink = z.infer<typeof FairMapLinkSchema>

export const FairMapSchema = z.object({
  id: z.string(),
  templateId: z.string(),

  templateVersionAtLink: z.number().int().optional(),

  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),

  template: MapTemplateSchema.optional().default(MAP_TEMPLATE_FALLBACK),
  links: z.array(FairMapLinkSchema).optional().default([]),
})
export type FairMap = z.infer<typeof FairMapSchema>

/** =========================
 * FAIR HEADER
 * ========================= */

export const FairSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ATIVA", "FINALIZADA", "CANCELADA"]),
  address: z.string(),

  stallsCapacity: z.number(),
  stallsReserved: z.number(),
  stallsRemaining: z.number(),

  taxes: z.array(FairTaxSchema),

  occurrences: z.array(
    z.object({
      id: z.string(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    }),
  ),

  contractSettings: FairContractSettingsSchema,

  map: FairMapSchema.nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type FairSummary = z.infer<typeof FairSummarySchema>

/** =========================
 * RESPONSE
 * ========================= */

export const FairExhibitorsResponseSchema = z.object({
  fair: FairSummarySchema,
  items: z.array(FairExhibitorRowSchema),
})
export type FairExhibitorsResponse = z.infer<typeof FairExhibitorsResponseSchema>

/** =========================
 * PATCH status
 * ========================= */

export const UpdateExhibitorStatusInputSchema = z.object({
  status: OwnerFairStatusSchema,
})
export type UpdateExhibitorStatusInput = z.infer<
  typeof UpdateExhibitorStatusInputSchema
>

export const OwnerFairStatusInfoSchema = z.object({
  requestedStatus: OwnerFairStatusSchema.optional(),
  appliedStatus: OwnerFairStatusSchema.optional(),
  computedStatus: OwnerFairStatusSchema.optional(),

  notes: z.array(z.string()).optional(),
  missing: z.array(z.string()).optional(),
})
export type OwnerFairStatusInfo = z.infer<typeof OwnerFairStatusInfoSchema>

export const OwnerFairSummarySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  fairId: z.string(),

  status: OwnerFairStatusSchema,
  stallsQty: z.number(),

  contractSignedAt: z.string().datetime().nullable().optional(),
  observations: z.string().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type OwnerFairSummary = z.infer<typeof OwnerFairSummarySchema>

export const UpdateExhibitorStatusResponseSchema = z.object({
  ownerFair: OwnerFairSummarySchema,
  info: OwnerFairStatusInfoSchema.optional(),
})
export type UpdateExhibitorStatusResponse = z.infer<
  typeof UpdateExhibitorStatusResponseSchema
>

/** =========================
 * PAYMENTS - settle installments (atalho)
 * ========================= */

export const SettleInstallmentsActionSchema = z.enum(["SET_PAID", "SET_UNPAID"])
export type SettleInstallmentsAction = z.infer<
  typeof SettleInstallmentsActionSchema
>

export const SettleInstallmentsInputSchema = z
  .object({
    purchaseId: z.string().min(1, "purchaseId é obrigatório."),
    action: SettleInstallmentsActionSchema,

    payAll: z.boolean().optional(),
    numbers: z.array(z.number().int().positive()).optional(),

    paidAt: DateOnlySchema.optional(),
    paidAmountCents: z.number().int().positive().optional(),
  })
  .refine(
    (v) =>
      v.payAll === true || (Array.isArray(v.numbers) && v.numbers.length > 0),
    {
      message: "Informe payAll=true ou numbers=[...].",
      path: ["numbers"],
    },
  )
export type SettleInstallmentsInput = z.infer<typeof SettleInstallmentsInputSchema>

export const SettleInstallmentsResponseSchema = z.object({
  ok: z.boolean(),
  purchaseId: z.string(),
  status: OwnerFairPaymentStatusSchema,
  installmentsCount: z.number(),
  paidCount: z.number(),
  paidCents: z.number(),
  totalCents: z.number(),

  ownerFairStatus: OwnerFairStatusSchema.nullable().optional(),
  ownerFairStatusInfo: OwnerFairStatusInfoSchema.nullable().optional(),
})
export type SettleInstallmentsResponse = z.infer<
  typeof SettleInstallmentsResponseSchema
>

/** =========================
 * PAYMENTS - reschedule installment
 * ========================= */

export const RescheduleInstallmentInputSchema = z.object({
  dueDate: DateOnlySchema,
  reason: z.string().max(500).optional(),
})
export type RescheduleInstallmentInput = z.infer<
  typeof RescheduleInstallmentInputSchema
>

/** =========================
 * PAYMENTS - create installment payment (histórico)
 * ========================= */

export const CreateInstallmentPaymentInputSchema = z.object({
  paidAt: DateOnlySchema,
  amountCents: z.number().int().positive(),
  note: z.string().max(500).optional(),
})
export type CreateInstallmentPaymentInput = z.infer<
  typeof CreateInstallmentPaymentInputSchema
>

export const InstallmentPaymentActionResponseSchema = z.object({
  ok: z.boolean(),

  purchaseId: z.string(),
  purchaseStatus: OwnerFairPaymentStatusSchema,
  purchaseTotalCents: z.number(),
  purchasePaidCents: z.number(),
  purchasePaidAt: z.string().datetime().nullable(),

  installmentId: z.string(),
  installmentNumber: z.number(),
  installmentAmountCents: z.number(),
  installmentPaidAmountCents: z.number(),
  installmentPaidAt: z.string().datetime().nullable(),
  installmentDueDate: z.string().datetime(),

  ownerFairStatus: OwnerFairStatusSchema.nullable().optional(),
  ownerFairStatusInfo: OwnerFairStatusInfoSchema.nullable().optional(),
})
export type InstallmentPaymentActionResponse = z.infer<
  typeof InstallmentPaymentActionResponseSchema
>

/** =========================
 * OBSERVATIONS (OwnerFair)
 * ========================= */

export const UpdateExhibitorObservationsInputSchema = z.object({
  observations: z.string().max(2000).nullable().optional(),
})
export type UpdateExhibitorObservationsInput = z.infer<
  typeof UpdateExhibitorObservationsInputSchema
>

export const UpdateExhibitorObservationsResponseSchema = z.object({
  ownerFair: z.object({
    id: z.string(),
    ownerId: z.string().optional(),
    fairId: z.string().optional(),
    observations: z.string().nullable().optional(),
    updatedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime().optional(),
    status: OwnerFairStatusSchema.optional(),
    stallsQty: z.number().optional(),
  }),
})
export type UpdateExhibitorObservationsResponse = z.infer<
  typeof UpdateExhibitorObservationsResponseSchema
>

/** =========================
 * HELPERS (UI)
 * ========================= */

export function exhibitorDisplayName(row: FairExhibitorRow) {
  return row.owner.fullName?.trim() || "—"
}

export function exhibitorDisplayDoc(row: FairExhibitorRow) {
  return row.owner.document || "—"
}

export function exhibitorDisplayContact(row: FairExhibitorRow) {
  return row.owner.phone?.trim() || row.owner.email?.trim() || "—"
}

export function ownerFairStatusLabel(status: OwnerFairStatus) {
  switch (status) {
    case "SELECIONADO":
      return "Selecionado"
    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento"
    case "AGUARDANDO_ASSINATURA":
      return "Aguardando assinatura"
    case "AGUARDANDO_BARRACAS":
      return "Aguardando barracas"
    case "CONCLUIDO":
      return "Concluído"
    default:
      return status
  }
}

export function stallSizeLabel(size: StallSize) {
  switch (size) {
    case "SIZE_2X2":
      return "2m x 2m"
    case "SIZE_3X3":
      return "3m x 3m"
    case "SIZE_3X6":
      return "3m x 6m"
    case "TRAILER":
      return "Trailer"
    case "CART":
      return "Carrinho"
    default:
      return size
  }
}

export function purchaseInstallmentsLabel(p: PurchasePaymentSummary) {
  return `${p.paidCount}/${p.installmentsCount}`
}

/**
 * ✅ Helper para exibir slot na UI (tabela/coluna)
 * - Mostra o number quando existir, senão cai no clientKey (fallback raro)
 */
export function slotLabel(slot: MapSlot | null | undefined) {
  if (!slot) return "—"
  if (typeof slot.number === "number") return `Slot ${slot.number}`
  return `Slot ${slot.clientKey}`
}