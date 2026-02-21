"use client";

import * as React from "react";
import type {
  FairExhibitorRow,
  OwnerFairStatus,
  StallSize,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema";
import {
  exhibitorDisplayName,
  ownerFairStatusLabel,
  stallSizeLabel,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { FairStallsRowActions } from "./fair-stalls-row-actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Mail,
  Phone,
  Link2,
  ShoppingBag,
  Ruler,
  CreditCard,
  MapPin,
} from "lucide-react";
import { getOwnerFairStatusMeta } from "./owner-fair-status-badges";
import { FairExhibitorContractDialog } from "../contratos/fair-exhibitor-contract-dialog";
import { ChangeExhibitorStatusDialog } from "../exhibitor/change-exhibitor-status-dialog";
import { FairExhibitorDetailsDialog } from "../exhibitor/fair-exhibitor-details-dialog";
import { ExhibitorPaymentsDialog } from "../pagamentos/exhibitor-payments-dialog";
import { FairTax } from "@/app/modules/fairs/fairs.schemas";
import { SlotMapDialog } from "../map/slot-map-dialog";

type Props = {
  fairId: string;
  data: FairExhibitorRow[];
  isLoading: boolean;
  isError: boolean;

  fairTaxes: FairTax[];
};

/**
 * Wrapper para tornar a tabela responsiva no mobile:
 * - scroll horizontal quando necessário
 * - mantém o layout do desktop (table-fixed + colgroup)
 */
function ResponsiveTableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("w-full overflow-x-auto", "[webkit-overflow-scrolling:touch]")}>
      <div className="min-w-full">{children}</div>
    </div>
  );
}

function TableColGroup() {
  /**
   * Importante: <colgroup> não pode ter whitespace/text nodes como filhos.
   * Geramos as colunas via array para evitar {" "} e erros de hydration.
   *
   * ✅ Ajuste:
   * - Coluna Expositor menor (14%) para forçar ellipsis em nomes longos.
   */
  const widths = [
    "8%", // Expositor (↓ era 18%)
    "14%", // Telefone
    "18%", // Email
    "7%",  // Slot
    "7%",  // Compradas
    "9%",  // Vinculadas
    "10%", // Tamanhos
    "12%", // Pagamentos
    "9%",  // Status
    "6%",  // Ações
  ];

  return (
    <colgroup>
      {widths.map((w, idx) => (
        <col key={idx} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

function formatMoneyBRLFromCents(cents?: number | null) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function paymentStatusLabel(status?: string | null) {
  switch (status) {
    case "PAID":
      return "Pago";
    case "PARTIALLY_PAID":
      return "Parcial";
    case "OVERDUE":
      return "Atrasado";
    case "PENDING":
      return "Pendente";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status ?? "—";
  }
}

function paymentTone(
  status?: string | null,
): "neutral" | "success" | "warn" | "danger" {
  switch (status) {
    case "PAID":
      return "success";
    case "PARTIALLY_PAID":
      return "warn";
    case "OVERDUE":
      return "danger";
    default:
      return "neutral";
  }
}

function groupPurchasedSizes(purchases: FairExhibitorRow["purchasesPayments"]) {
  const map = new Map<StallSize, number>();
  for (const p of purchases ?? []) {
    const prev = map.get(p.stallSize) ?? 0;
    map.set(p.stallSize, prev + (p.qty ?? 0));
  }
  return Array.from(map.entries())
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function sizesLinesFromPurchases(purchases: FairExhibitorRow["purchasesPayments"]) {
  const grouped = groupPurchasedSizes(purchases);
  if (grouped.length === 0) return ["Nenhum tamanho informado."];

  return grouped.map(([size, qty]) => `${stallSizeLabel(size)} · ${qty}`);
}

function sizesLabelFromPurchases(purchases: FairExhibitorRow["purchasesPayments"]) {
  const grouped = groupPurchasedSizes(purchases);
  if (grouped.length === 0) return "—";
  return `${grouped.length} tipo(s)`;
}

function paymentLines(row: FairExhibitorRow) {
  const p = row.payment;
  if (!p) return ["Sem dados de pagamento."];

  return [
    `Status: ${paymentStatusLabel(p.status)}`,
    `Compras: ${p.purchasesCount}`,
    `Pago: ${formatMoneyBRLFromCents(p.paidCents)}`,
    `Total: ${formatMoneyBRLFromCents(p.totalCents)}`,
  ];
}

/**
 * Resolve o “estado do slot” para a linha do expositor.
 * Motivação:
 * - Esta tabela é por expositor, mas o slot é por barraca (linkedStalls).
 */
function resolveRowSlotState(row: FairExhibitorRow) {
  const stalls = row.linkedStalls ?? [];
  if (stalls.length === 0) {
    return {
      kind: "none" as const,
      slotNumber: null as number | null,
      slotClientKey: null as string | null,
    };
  }

  if (stalls.length === 1) {
    const s = stalls[0]?.slot ?? null;
    return {
      kind: s ? ("single_ok" as const) : ("single_missing" as const),
      slotNumber: s?.number ?? null,
      slotClientKey: s?.clientKey ?? null,
    };
  }

  const withSlot = stalls.filter((s) => !!s.slot);
  const allHave = withSlot.length === stalls.length;

  if (allHave) {
    return {
      kind: "multi_ok" as const,
      slotNumber: null as number | null,
      slotClientKey: null as string | null,
    };
  }
  return {
    kind: "multi_missing" as const,
    slotNumber: null as number | null,
    slotClientKey: null as string | null,
  };
}

function TableSkeleton() {
  const rows = Array.from({ length: 10 });

  return (
    <ResponsiveTableWrap>
      <Table className="table-fixed w-max min-w-full">
        <TableColGroup />
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="whitespace-nowrap">Expositor</TableHead>
            <TableHead className="whitespace-nowrap">Telefone</TableHead>
            <TableHead className="whitespace-nowrap">Email</TableHead>
            <TableHead className="whitespace-nowrap text-center">Slot</TableHead>
            <TableHead className="whitespace-nowrap text-center">Compradas</TableHead>
            <TableHead className="whitespace-nowrap text-center">Vinculadas</TableHead>
            <TableHead className="whitespace-nowrap text-center">Tamanhos</TableHead>
            <TableHead className="whitespace-nowrap text-center">Pagamentos</TableHead>
            <TableHead className="whitespace-nowrap text-center">Status</TableHead>
            <TableHead className="whitespace-nowrap text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((_, idx) => (
            <TableRow key={idx} className="hover:bg-transparent">
              <TableCell>
                <Skeleton className="h-4 w-[180px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[160px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-[180px]" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-8 w-8 rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-7 w-[70px] rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-7 w-[86px] rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-7 w-[110px] rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-7 w-[160px] rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-7 w-[110px] rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-8 w-8 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ResponsiveTableWrap>
  );
}

function Chip({
  icon,
  label,
  tone = "neutral",
  tooltipTitle,
  tooltipLines,
  className,
  asButton,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "success" | "warn" | "danger";
  tooltipTitle: string;
  tooltipLines: string[];
  className?: string;
  asButton?: boolean;
  onClick?: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-muted/60 bg-muted/20 text-foreground";

  const Base = (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tabular-nums",
        "hover:bg-muted/30 transition",
        "max-w-full",
        toneClass,
        asButton ? "cursor-pointer select-none" : "cursor-default",
        className,
      )}
      onClick={asButton ? onClick : undefined}
      role={asButton ? "button" : undefined}
      tabIndex={asButton ? 0 : undefined}
    >
      <span className="opacity-80 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{Base}</TooltipTrigger>
        <TooltipContent className="max-w-[360px]">
          <div className="text-xs font-medium">{tooltipTitle}</div>
          <div className="mt-1 space-y-0.5">
            {tooltipLines.map((l, idx) => (
              <div key={idx} className="text-xs text-muted-foreground">
                {l}
              </div>
            ))}
            {asButton ? (
              <div className="text-xs mt-2 text-foreground font-medium">
                Clique para abrir detalhes
              </div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StatusBadge({ status }: { status: OwnerFairStatus }) {
  const label = ownerFairStatusLabel(status);
  const meta = getOwnerFairStatusMeta(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium border-muted/60",
        "whitespace-nowrap text-center leading-tight",
        "max-w-full",
        meta.className,
      )}
    >
      {label}
    </Badge>
  );
}

/**
 * Bolinha de slot (clicável).
 */
function SlotDot({
  state,
  onClick,
}: {
  state:
    | { kind: "none" | "single_missing" | "multi_missing"; slotNumber: null; slotClientKey: string | null }
    | { kind: "single_ok"; slotNumber: number | null; slotClientKey: string | null }
    | { kind: "multi_ok"; slotNumber: null; slotClientKey: null };
  onClick: () => void;
}) {
  const isOk = state.kind === "single_ok" || state.kind === "multi_ok";

  const label =
    state.kind === "single_ok"
      ? typeof state.slotNumber === "number"
        ? String(state.slotNumber)
        : "✓"
      : state.kind === "multi_ok"
        ? "•"
        : "?";

  const tooltipTitle =
    state.kind === "single_ok"
      ? "Slot vinculado"
      : state.kind === "multi_ok"
        ? "Vários slots"
        : "Sem slot";

  const tooltipLines =
    state.kind === "single_ok"
      ? [
          typeof state.slotNumber === "number"
            ? `Slot ${state.slotNumber}`
            : "Slot vinculado (sem número).",
          "Clique para abrir o mapa.",
        ]
      : state.kind === "multi_ok"
        ? ["Este expositor possui múltiplas barracas.", "Clique para abrir o mapa."]
        : state.kind === "none"
          ? ["Nenhuma barraca vinculada ainda.", "Clique para abrir o mapa."]
          : ["Há barraca(s) sem slot.", "Clique para abrir o mapa."];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
              "transition hover:scale-[1.03] active:scale-[0.98]",
              isOk
                ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                : "border-rose-200 bg-rose-100 text-rose-800",
            )}
            aria-label={tooltipTitle}
            title={tooltipTitle}
          >
            <span className="leading-none">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[360px]">
          <div className="text-xs font-medium flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 opacity-80" />
            {tooltipTitle}
          </div>
          <div className="mt-1 space-y-0.5">
            {tooltipLines.map((l, idx) => (
              <div key={idx} className="text-xs text-muted-foreground">
                {l}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FairStallsTable({
  fairId,
  data,
  isLoading,
  isError,
  fairTaxes,
}: Props) {
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [statusRow, setStatusRow] = React.useState<FairExhibitorRow | null>(null);

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsRow, setDetailsRow] = React.useState<FairExhibitorRow | null>(null);

  const [paymentsOpen, setPaymentsOpen] = React.useState(false);
  const [paymentsRow, setPaymentsRow] = React.useState<FairExhibitorRow | null>(null);

  const [contractOpen, setContractOpen] = React.useState(false);
  const [contractRow, setContractRow] = React.useState<FairExhibitorRow | null>(null);

  const [slotOpen, setSlotOpen] = React.useState(false);
  const [slotRow, setSlotRow] = React.useState<FairExhibitorRow | null>(null);

  function handleChangeStatus(row: FairExhibitorRow) {
    setStatusRow(row);
    setStatusOpen(true);
  }

  function handleViewExhibitorDetails(row: FairExhibitorRow) {
    setDetailsRow(row);
    setDetailsOpen(true);
  }

  function handleOpenPayments(row: FairExhibitorRow) {
    setPaymentsRow(row);
    setPaymentsOpen(true);
  }

  function handleOpenContract(row: FairExhibitorRow) {
    setContractRow(row);
    setContractOpen(true);
  }

  function handleOpenSlotMap(row: FairExhibitorRow) {
    setSlotRow(row);
    setSlotOpen(true);
  }

  const slotState = slotRow ? resolveRowSlotState(slotRow) : null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <SlotMapDialog
        open={slotOpen}
        onOpenChange={(open) => {
          setSlotOpen(open);
          if (!open) setSlotRow(null);
        }}
        fairId={fairId}
        exhibitorName={slotRow ? exhibitorDisplayName(slotRow) : "—"}
        slotNumber={slotState && slotState.kind === "single_ok" ? slotState.slotNumber : null}
        slotClientKey={slotState && slotState.kind === "single_ok" ? slotState.slotClientKey : null}
      />

      <FairExhibitorContractDialog
        open={contractOpen}
        onOpenChange={(open) => {
          setContractOpen(open);
          if (!open) setContractRow(null);
        }}
        fairId={fairId}
        row={contractRow}
      />

      <ChangeExhibitorStatusDialog
        fairId={fairId}
        row={statusRow}
        open={statusOpen}
        onOpenChange={(open) => {
          setStatusOpen(open);
          if (!open) setStatusRow(null);
        }}
      />

      <FairExhibitorDetailsDialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailsRow(null);
        }}
        row={detailsRow}
        fairId={fairId}
        taxes={fairTaxes}
      />

      <ExhibitorPaymentsDialog
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
        fairId={fairId}
        ownerFairId={paymentsRow?.ownerFairId ?? null}
      />

      <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Expositores vinculados</div>
          <div className="text-xs text-muted-foreground">
            {isLoading
              ? "Carregando…"
              : isError
                ? "Não foi possível carregar. Verifique o backend e tente novamente."
                : `${data.length} registro(s) nesta lista.`}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="px-1">
          <TableSkeleton />
        </div>
      ) : (
        <div className="px-1">
          <ResponsiveTableWrap>
            <Table className="table-fixed w-max min-w-full">
              <TableColGroup />

              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="whitespace-nowrap">Expositor</TableHead>
                  <TableHead className="whitespace-nowrap">Telefone</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Slot</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Compradas</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Vinculadas</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Tamanhos</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Pagamentos</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Status</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((row) => {
                  const name = exhibitorDisplayName(row);

                  const purchased = row.stallsQtyPurchased;
                  const linked = row.stallsQtyLinked;
                  const complete = purchased > 0 && linked >= purchased;
                  const linkedTone = complete ? "success" : linked > 0 ? "warn" : "neutral";

                  const sizesLabel = sizesLabelFromPurchases(row.purchasesPayments);
                  const sizesTooltipLines = sizesLinesFromPurchases(row.purchasesPayments);

                  const phone = row.owner.phone?.trim() || "—";
                  const email = row.owner.email?.trim() || "—";

                  const p = row.payment;
                  const hasPayment = !!p;
                  const paymentsLabel = !p
                    ? "—"
                    : `${formatMoneyBRLFromCents(p.paidCents)} / ${formatMoneyBRLFromCents(p.totalCents)}`;
                  const paymentsTone = paymentTone(p?.status);

                  const slot = resolveRowSlotState(row);

                  return (
                    <TableRow key={row.ownerFairId} className="transition hover:bg-muted/30">
                      {/* ✅ Expositor menor + ellipsis + tooltip com nome completo */}
                      <TableCell className="min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate min-w-0 block">
                                  {name}
                                </span>
                                <span className="text-muted-foreground font-normal whitespace-nowrap shrink-0">
                                  {row.owner.personType}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[360px]">
                              <div className="text-xs font-medium">{name}</div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-4 w-4 opacity-70 shrink-0" />
                          <span className="truncate whitespace-nowrap">{phone}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-4 w-4 opacity-70 shrink-0" />
                          <span className="truncate whitespace-nowrap">{email}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <SlotDot state={slot as any} onClick={() => handleOpenSlotMap(row)} />
                      </TableCell>

                      <TableCell className="text-center">
                        <Chip
                          icon={<ShoppingBag className="h-3.5 w-3.5" />}
                          label={`${purchased}`}
                          tooltipTitle="Barracas compradas"
                          tooltipLines={[`Total comprado nesta feira: ${purchased}`]}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <Chip
                          icon={<Link2 className="h-3.5 w-3.5" />}
                          label={`${linked}/${purchased}`}
                          tooltipTitle="Barracas vinculadas"
                          tooltipLines={[
                            `Vinculadas: ${linked}`,
                            `Compradas: ${purchased}`,
                            complete ? "✅ Expositor já vinculou tudo." : "⏳ Ainda faltam vínculos.",
                          ]}
                          tone={linkedTone}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <Chip
                          icon={<Ruler className="h-3.5 w-3.5" />}
                          label={sizesLabel}
                          tooltipTitle="Tamanhos comprados"
                          tooltipLines={sizesTooltipLines}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <Chip
                          icon={<CreditCard className="h-3.5 w-3.5" />}
                          label={paymentsLabel}
                          tooltipTitle="Pagamentos"
                          tooltipLines={paymentLines(row)}
                          tone={paymentsTone}
                          asButton={hasPayment}
                          onClick={() => handleOpenPayments(row)}
                          className={!hasPayment ? "opacity-70" : ""}
                        />
                      </TableCell>

                      <TableCell className="text-center min-w-0">
                        <StatusBadge status={row.status} />
                      </TableCell>

                      <TableCell className="text-center">
                        <FairStallsRowActions
                          row={row}
                          onViewExhibitorDetails={handleViewExhibitorDetails}
                          onChangeStatus={handleChangeStatus}
                          onOpenPayments={handleOpenPayments}
                          onOpenContract={handleOpenContract}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!isError && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center">
                      <div className="text-sm font-medium">Nenhum expositor encontrado</div>
                      <div className="text-xs text-muted-foreground">
                        Tente alterar os filtros de busca.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ResponsiveTableWrap>
        </div>
      )}
    </div>
  );
}