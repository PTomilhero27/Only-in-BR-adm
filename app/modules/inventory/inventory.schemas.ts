/**
 * Schemas Zod do módulo de Estoque / Armazenagem.
 *
 * Responsabilidade:
 * - Validar entradas enviadas para a API nos pontos críticos.
 * - Normalizar respostas do backend, aceitando payloads paginados ou arrays.
 * - Evitar que pequenas diferenças de serializer quebrem a UI administrativa.
 */

import { z } from "zod";

export const inventoryItemStatusSchema = z.enum([
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "INACTIVE",
  "DAMAGED",
]);

export const inventoryReservationStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "SEPARATING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "PARTIALLY_RETURNED",
  "RETURNED",
  "CANCELLED",
]);

export const inventoryMovementTypeSchema = z.enum([
  "IN",
  "OUT",
  "RETURN",
  "LOSS",
  "ADJUSTMENT",
  "DAMAGE",
]);

const numberFromApi = z.coerce.number().catch(0);
const nullableString = z.string().nullable().optional();

export const inventoryItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: nullableString,
    unit: z.string().catch("UN").optional(),
    imageUrl: nullableString,
    location: nullableString,
    currentQty: numberFromApi.optional(),
    quantity: numberFromApi.optional(),
    minQty: numberFromApi.optional(),
    minimumQty: numberFromApi.optional(),
    minQuantity: numberFromApi.optional(),
    status: inventoryItemStatusSchema.catch("IN_STOCK").optional(),
    notes: nullableString,
    reservedQty: numberFromApi.optional(),
    availableQty: numberFromApi.optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .transform((item) => ({
    ...item,
    currentQty: item.currentQty ?? item.quantity ?? 0,
    minQty: item.minQty ?? item.minimumQty ?? item.minQuantity ?? 0,
    status: item.status ?? "IN_STOCK",
    unit: item.unit ?? "UN",
  }));

export const inventoryReservationItemSchema = z
  .object({
    id: z.string().optional(),
    itemId: z.string().catch(""),
    inventoryItemId: z.string().optional(),
    item: inventoryItemSchema.nullable().optional(),
    itemName: nullableString,
    requestedQty: numberFromApi,
    approvedQty: numberFromApi.optional(),
    pickedQty: numberFromApi.optional(),
    returnedQty: numberFromApi.optional(),
    lostQty: numberFromApi.optional(),
    consumedQty: numberFromApi.optional(),
    damagedQty: numberFromApi.optional(),
    notes: nullableString,
  })
  .transform((item) => ({
    ...item,
    itemId: item.itemId || item.inventoryItemId || item.item?.id || "",
    itemName: item.itemName ?? item.item?.name ?? null,
  }));

export const inventoryMovementSchema = z
  .object({
    id: z.string(),
    itemId: z.string().nullable().optional(),
    inventoryItemId: z.string().nullable().optional(),
    item: inventoryItemSchema.nullable().optional(),
    itemName: nullableString,
    reservationId: z.string().nullable().optional(),
    inventoryReservationId: z.string().nullable().optional(),
    fairId: z.string().nullable().optional(),
    fairName: nullableString,
    purpose: nullableString,
    type: inventoryMovementTypeSchema.catch("ADJUSTMENT"),
    quantity: numberFromApi,
    previousQty: numberFromApi.nullable().optional(),
    nextQty: numberFromApi.nullable().optional(),
    responsibleName: nullableString,
    createdByName: nullableString,
    notes: nullableString,
    createdAt: z.string().optional(),
  })
  .transform((movement) => ({
    ...movement,
    itemId: movement.itemId ?? movement.inventoryItemId ?? movement.item?.id,
    reservationId:
      movement.reservationId ?? movement.inventoryReservationId ?? null,
    itemName: movement.itemName ?? movement.item?.name ?? null,
  }));

export const inventoryReservationSchema = z
  .object({
    id: z.string(),
    code: nullableString,
    fairId: z.string().nullable().optional(),
    fairName: nullableString,
    fair: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
      })
      .nullable()
      .optional(),
    purpose: nullableString,
    requesterName: nullableString,
    responsibleName: nullableString,
    expectedPickupAt: z.string().nullable().optional(),
    pickedUpAt: z.string().nullable().optional(),
    returnedAt: z.string().nullable().optional(),
    notes: nullableString,
    status: inventoryReservationStatusSchema.catch("PENDING"),
    items: z.array(inventoryReservationItemSchema).catch([]),
    movements: z.array(inventoryMovementSchema).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .transform((reservation) => ({
    ...reservation,
    fairId: reservation.fairId ?? reservation.fair?.id ?? null,
    fairName: reservation.fairName ?? reservation.fair?.name ?? null,
  }));

export function listResponseSchema<T extends z.ZodType>(schema: T) {
  return z
    .preprocess((val: any) => {
      if (!val) return val;
      if (Array.isArray(val)) return val;
      if (typeof val === "object") {
        if ("items" in val && !("data" in val)) {
          return {
            ...val,
            data: val.items,
          };
        }
      }
      return val;
    }, z.union([
      z.array(schema).transform((data) => ({ data })),
      z.object({
        data: z.array(schema).catch([]),
        total: z.coerce.number().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }).passthrough(),
    ]));
}

export const inventoryItemsResponseSchema = listResponseSchema(inventoryItemSchema);
export const inventoryReservationsResponseSchema = listResponseSchema(
  inventoryReservationSchema,
);
export const inventoryMovementsResponseSchema = listResponseSchema(
  inventoryMovementSchema,
);

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do item."),
  category: z.string().trim().nullable().optional(),
  unit: z.string().trim().min(1, "Informe a unidade.").default("UN"),
  imageUrl: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  initialQty: z.coerce.number().int().min(0).optional(),
  minQty: z.coerce.number().int().min(0, "Quantidade mínima inválida."),
  status: inventoryItemStatusSchema.optional(),
  notes: z.string().trim().nullable().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const createInventoryMovementSchema = z
  .object({
    type: z.enum(["IN", "ADJUSTMENT", "DAMAGE"]),
    quantity: z.coerce.number().int().positive("Informe uma quantidade válida."),
    notes: z.string().trim().optional(),
    purpose: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.type === "ADJUSTMENT" || value.type === "DAMAGE") && !value.notes) {
      ctx.addIssue({
        code: "custom",
        path: ["notes"],
        message: "Observação obrigatória para ajuste ou dano.",
      });
    }
  });

export const checkInventoryAvailabilitySchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

export const inventoryAvailabilityResponseSchema = z.union([
  z.array(
    z.object({
      itemId: z.string(),
      itemName: z.string().optional(),
      requestedQty: numberFromApi,
      availableQty: numberFromApi,
      isAvailable: z.boolean().catch(true),
    }),
  ),
  z.object({
    items: z.array(
      z.object({
        itemId: z.string(),
        itemName: z.string().optional(),
        requestedQty: numberFromApi,
        availableQty: numberFromApi,
        isAvailable: z.boolean().catch(true),
      }),
    ),
  }),
]).transform((value) => (Array.isArray(value) ? value : value.items));

export const createInventoryReservationSchema = z
  .object({
    fairId: z.string().nullable().optional(),
    purpose: z.string().trim().nullable().optional(),
    requesterName: z.string().trim().nullable().optional(),
    responsibleName: z.string().trim().nullable().optional(),
    expectedPickupAt: z.string().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    items: z
      .array(
        z.object({
          itemId: z.string().min(1, "Selecione o item."),
          requestedQty: z.coerce.number().int().positive("Quantidade inválida."),
          notes: z.string().trim().nullable().optional(),
        }),
      )
      .min(1, "Adicione pelo menos um item."),
  })
  .superRefine((value, ctx) => {
    if (!value.fairId && !value.purpose) {
      ctx.addIssue({
        code: "custom",
        path: ["purpose"],
        message: "Informe a finalidade quando não houver feira vinculada.",
      });
    }

    const duplicated = value.items.find(
      (row, index) => value.items.findIndex((it) => it.itemId === row.itemId) !== index,
    );
    if (duplicated) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Não repita o mesmo item na reserva.",
      });
    }
  });

export const approveInventoryReservationSchema = z.object({
  notes: z.string().trim().nullable().optional(),
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      approvedQty: z.coerce.number().int().min(0),
      notes: z.string().trim().nullable().optional(),
    }),
  ),
});

export const pickupInventoryReservationSchema = z.object({
  notes: z.string().trim().nullable().optional(),
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      pickedQty: z.coerce.number().int().min(0),
      notes: z.string().trim().nullable().optional(),
    }),
  ),
});

export const returnInventoryReservationSchema = z.object({
  notes: z.string().trim().nullable().optional(),
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      returnedQty: z.coerce.number().int().min(0),
      consumedQty: z.coerce.number().int().min(0).optional(),
      lostQty: z.coerce.number().int().min(0).optional(),
      damagedQty: z.coerce.number().int().min(0).optional(),
      notes: z.string().trim().nullable().optional(),
    }),
  ),
});

export const cancelInventoryReservationSchema = z.object({
  notes: z.string().trim().min(1, "Informe o motivo do cancelamento."),
});

export const inventoryImportParamsSchema = z.object({
  sheetName: z.string().trim().optional(),
  headerRow: z.coerce.number().int().positive().optional(),
  dataStartRow: z.coerce.number().int().positive().optional(),
});

export const inventoryImportRowItemSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string(),
  quantity: numberFromApi,
  notes: nullableString,
  imageUrl: nullableString,
  existingItem: inventoryItemSchema.nullable().optional(),
});

export const inventoryImportRowSchema = z.object({
  rowNumber: z.coerce.number(),
  action: z.enum(["CREATE", "UPDATE"]),
  status: z.enum(["VALID", "INVALID"]),
  item: inventoryImportRowItemSchema,
  errors: z.array(z.string()).catch([]),
  warnings: z.array(z.string()).catch([]),
});

export const inventoryImportSummarySchema = z.object({
  totalRows: numberFromApi,
  validCount: numberFromApi,
  newCount: numberFromApi,
  updateCount: numberFromApi,
  errorCount: numberFromApi,
});

export const inventoryImportPreviewResponseSchema = z.object({
  summary: inventoryImportSummarySchema,
  rows: z.array(inventoryImportRowSchema),
});

export const inventoryImportConfirmResponseSchema = z.object({
  message: z.string(),
  createdCount: numberFromApi,
  updatedCount: numberFromApi,
});

