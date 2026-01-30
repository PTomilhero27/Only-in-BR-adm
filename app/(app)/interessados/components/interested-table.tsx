"use client"

/**
 * Tabela de interessados.
 * Responsabilidade:
 * - Exibir listagem resumida (Owner)
 * - Emitir seleção ao clicar na linha
 * - Paginação estilo "Rows per page" + setas, integrada ao backend
 * - Skeleton bonito durante carregamento
 *
 * Evolução desta etapa:
 * - ✅ Adiciona as colunas "Acesso" (login/senha) e "Barracas" (stallsCount)
 * - Esses campos ainda podem vir como undefined enquanto o backend não foi ajustado
 *   (por isso tratamos com fallback "—" sem quebrar a UI).
 */

import {
  interestDisplayDate,
  interestDisplayLocation,
  interestDisplayName,
  type InterestsListResponse,
  type InterestListItem,
} from "@/app/modules/interests/interests.schema"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table"

import { DataTablePagination } from "@/components/table/data-table-pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

type Props = {
  data?: InterestsListResponse
  isLoading: boolean
  isError: boolean
  onSelect: (interest: InterestListItem) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function formatBRDate(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR")
}

/**
 * Renderiza o "badge" de acesso ao portal.
 * - `true`  => Com login (senha definida)
 * - `false` => Sem login (ainda não habilitado ou senha não definida)
 * - `undefined` => backend ainda não implementou (fallback)
 */
function AccessBadge({ value }: { value?: boolean }) {
  if (typeof value !== "boolean") {
    return <span className="text-muted-foreground">—</span>
  }

  if (value) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200">
        Ok
      </Badge>
    )
  }

  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200">
      No
    </Badge>
  )
}

/**
 * Renderiza o valor de barracas cadastradas.
 * - number => exibe o valor
 * - undefined => backend ainda não implementou (fallback)
 */
function StallsCountCell({ value }: { value?: number }) {
  if (typeof value !== "number") {
    return <span className="text-muted-foreground">—</span>
  }
  return <span className="font-medium tabular-nums">{value}</span>
}

function TableSkeleton() {
  // 6 linhas “realistas”
  const rows = Array.from({ length: 6 })

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead>Interessado</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>E-mail</TableHead>

            {/* ✅ NOVO: Acesso */}
            <TableHead className="w-[140px] text-center">Acesso</TableHead>

            {/* ✅ NOVO: Barracas */}
            <TableHead className="w-[120px] text-center">Barracas</TableHead>

            <TableHead>Cidade/UF</TableHead>
            <TableHead className="text-right">Atualizado</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((_, idx) => (
            <TableRow key={idx} className="hover:bg-transparent">
              {/* Interessado */}
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[180px]" />
                    <Skeleton className="h-3 w-[90px]" />
                  </div>
                </div>
              </TableCell>

              {/* Documento */}
              <TableCell>
                <Skeleton className="h-6 w-[140px] rounded-full" />
              </TableCell>

              {/* Email */}
              <TableCell>
                <Skeleton className="h-4 w-[220px]" />
              </TableCell>

              {/* Acesso */}
              <TableCell>
                <Skeleton className="h-6 w-[96px] rounded-full" />
              </TableCell>

              {/* Barracas */}
              <TableCell>
                <Skeleton className="h-4 w-[40px]" />
              </TableCell>

              {/* Cidade/UF */}
              <TableCell>
                <Skeleton className="h-4 w-[200px]" />
              </TableCell>

              {/* Atualizado */}
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-[150px]" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="border-t">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <Skeleton className="h-4 w-[170px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-[78px] rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </>
  )
}

export function InterestedTable({
  data,
  isLoading,
  isError,
  onSelect,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const items = data?.items ?? []
  const meta = data?.meta
  const totalItems = meta?.totalItems ?? 0

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Lista de interessados</div>

          <div className="text-xs text-muted-foreground">
            {isLoading ? (
              <div className="mt-1">
                <Skeleton className="h-3 w-[220px]" />
              </div>
            ) : isError ? (
              "Não foi possível carregar. Verifique o backend e tente novamente."
            ) : (
              `${totalItems} registro(s) no total.`
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-3 w-[90px]" />
          ) : meta ? (
            <>
              Página <span className="font-medium text-foreground">{meta.page}</span>{" "}
              de <span className="font-medium text-foreground">{meta.totalPages}</span>
            </>
          ) : (
            "—"
          )}
        </div>
      </div>

      {/* Corpo */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead>Interessado</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>E-mail</TableHead>

                {/* ✅ NOVO */}
                <TableHead className="w-[140px] text-center">Acesso</TableHead>

                {/* ✅ NOVO */}
                <TableHead className="w-[120px] text-center">Barracas</TableHead>

                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-right">Atualizado</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((i) => (
                <TableRow
                  key={i.id}
                  className="cursor-pointer transition hover:bg-muted/30"
                  onClick={() => onSelect(i)}
                  title="Clique para ver detalhes"
                >
                  {/* Interessado */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                        {(interestDisplayName(i)?.[0] ?? "—").toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium truncate">{interestDisplayName(i)}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {i.personType}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Documento */}
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {i.document ?? "—"}
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-sm">{i.email ?? "—"}</TableCell>

                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <AccessBadge value={(i as any).hasPortalLogin} />
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <StallsCountCell value={(i as any).stallsCount} />
                  </TableCell>

                  {/* Cidade/UF */}
                  <TableCell className="text-sm text-muted-foreground">
                    {interestDisplayLocation(i)}
                  </TableCell>

                  {/* Atualizado */}
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatBRDate(interestDisplayDate(i))}
                  </TableCell>
                </TableRow>
              ))}

              {!isError && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="text-sm font-medium">Nenhum interessado encontrado</div>
                    <div className="text-xs text-muted-foreground">
                      Tente alterar os filtros de busca.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Footer */}
          <div className="border-t">
            <div className="flex items-center justify-between gap-2 px-5 py-3">
              <div className="text-xs text-muted-foreground">
                {totalItems > 0 ? (
                  <>
                    Mostrando{" "}
                    <span className="font-medium text-foreground">{items.length}</span>{" "}
                    nesta página
                  </>
                ) : (
                  "—"
                )}
              </div>

              {meta && (
                <DataTablePagination
                  page={meta.page}
                  pageSize={meta.pageSize}
                  totalItems={meta.totalItems}
                  totalPages={meta.totalPages}
                  isLoading={false}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
