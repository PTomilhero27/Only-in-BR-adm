"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import { PixKeyTypeBadge } from "../../fair-suppliers/components/pix-key-type-badge";
import {
  formatDocument,
  formatMoneyBRLFromCents,
  getPayoutAmountCents,
  getPayoutDocument,
  getPayoutName,
  getPayoutPixKey,
  type ExhibitorPayout,
} from "../exhibitor-payouts.schema";

export function ExhibitorPayoutsTable({
  data,
  isLoading,
  isError,
}: {
  data: ExhibitorPayout[];
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow className="bg-muted/35 hover:bg-muted/35">
            <TableHead>Expositor / titular</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Chave Pix</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor liquido</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>OwnerFair</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-primary/58">
                Carregando repasses...
              </TableCell>
            </TableRow>
          ) : null}

          {!isLoading && isError ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-rose-700">
                Nao foi possivel carregar os repasses.
              </TableCell>
            </TableRow>
          ) : null}

          {!isLoading && !isError
            ? data.map((payout, index) => {
                const pixKey = getPayoutPixKey(payout);
                const hasOwnerFair = !!(payout.ownerFairId || payout.ownerFair?.id);

                return (
                  <TableRow key={payout.id ?? `${payout.ownerFairId ?? "payout"}-${index}`} className="hover:bg-muted/20">
                    <TableCell className="max-w-[240px] truncate font-medium">{getPayoutName(payout)}</TableCell>
                    <TableCell>{formatDocument(getPayoutDocument(payout))}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs font-medium text-primary">{pixKey ?? "-"}</TableCell>
                    <TableCell>
                      <PixKeyTypeBadge type={payout.pixKeyType as any} />
                    </TableCell>
                    <TableCell>{formatMoneyBRLFromCents(getPayoutAmountCents(payout))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
                        {payout.status ?? "Importado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hasOwnerFair ? (
                        <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                          Vinculado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 rounded-full border-amber-200 bg-amber-50 text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          Conferir
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            : null}

          {!isLoading && !isError && data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-primary/58">
                Nenhum repasse de expositor encontrado.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
