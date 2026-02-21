"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LayoutGrid, Map, Plus, CheckCircle2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  useMapTemplatesQuery,
  useDeleteMapTemplateMutation,
} from "@/app/modules/mapa-templates/map-templates.queries";

import { useSetFairMapTemplateMutation } from "@/app/modules/fair-maps/fair-maps.queries";

import { MapTemplateMetaDialog } from "./map-template-editor-dialog";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";

type Props = {
  fairId: string;
  fairMap: any | null;
  fairMapLoading: boolean;
  fairMapError: any | null;
};

type TemplateMeta = {
  id: string;
  title: string;
  description?: string | null;
  worldWidth: number;
  worldHeight: number;
};

export function FairMapTemplatesPanel({
  fairId,
  fairMap,
  fairMapLoading,
  fairMapError,
}: Props) {
  const router = useRouter();

  const templates = useMapTemplatesQuery();
  const apply = useSetFairMapTemplateMutation(fairId);
  const del = useDeleteMapTemplateMutation();

  const [openCreate, setOpenCreate] = React.useState(false);
  const [editTemplate, setEditTemplate] = React.useState<TemplateMeta | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string;
    title: string;
  } | null>(null);

  const currentTemplateId = fairMap?.template?.id ?? null;

  async function confirmDelete() {
    if (!deleteTarget) return;
    await del.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="p-6 space-y-6">
      <AppBreadcrumb
        items={[
          { label: "home", href: "/dashboard" },
          { label: `Dashboard`, href: `/feiras/${fairId}` },
          { label: "Mapa" },
        ]}
      />
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Mapa da Feira</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma planta para esta feira e depois abra o editor
            operacional para vincular slots.
          </p>
        </div>

        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar nova planta
        </Button>
      </div>

      {/* Estado atual */}
      <div className="rounded-2xl border bg-background p-6">
        {fairMapLoading ? (
          <div className="text-sm text-muted-foreground">
            Carregando mapa atual…
          </div>
        ) : fairMapError ? (
          <div className="text-sm text-destructive">
            Erro ao carregar mapa atual.
          </div>
        ) : fairMap ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div className="text-sm font-medium">
                  Planta aplicada nesta feira
                </div>
              </div>

              <div className="text-lg font-semibold">
                {fairMap.template.title}
              </div>

              <div className="text-xs text-muted-foreground">
                {fairMap.template.worldWidth}×{fairMap.template.worldHeight} • v
                {fairMap.template.version}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/feiras/${fairId}/mapa/editor`)}
              >
                Abrir mapa
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Map className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">
              Mapa ainda não configurado
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Esta feira ainda não possui uma planta aplicada. Escolha uma
              planta existente abaixo ou crie uma nova.
            </p>
          </div>
        )}
      </div>

      {/* Lista de templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LayoutGrid className="h-4 w-4" />
          Plantas disponíveis
        </div>

        {templates.isLoading ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Carregando plantas…
          </div>
        ) : templates.error ? (
          <div className="rounded-xl border p-6 text-sm text-destructive">
            Erro ao carregar plantas.
          </div>
        ) : templates.data?.items?.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.data.items.map((t) => {
              const isApplied = currentTemplateId === t.id;
              const isBusy = apply.isPending || del.isPending;

              return (
                <div
                  key={t.id}
                  className={`rounded-xl border bg-background p-4 space-y-3 ${isApplied ? "ring-1 ring-emerald-500/40" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-medium">{t.title}</div>

                      {isApplied ? (
                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          Aplicada
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {t.worldWidth}×{t.worldHeight} • v{t.version}
                    </div>

                    {t.description ? (
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {t.description}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setEditTemplate({
                          id: t.id,
                          title: t.title,
                          description: t.description ?? null,
                          worldWidth: t.worldWidth,
                          worldHeight: t.worldHeight,
                        })
                      }
                    >
                      Editar
                    </Button>

                    <Button
                      size="sm"
                      disabled={apply.isPending || isApplied}
                      onClick={() => apply.mutate({ templateId: t.id })}
                    >
                      {isApplied
                        ? "Aplicada"
                        : apply.isPending
                          ? "Aplicando…"
                          : "Aplicar"}
                    </Button>

                    {/* Lixeira */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-destructive hover:text-destructive"
                      disabled={isBusy || isApplied}
                      title={
                        isApplied
                          ? "Você não pode excluir a planta aplicada"
                          : "Excluir"
                      }
                      onClick={() =>
                        setDeleteTarget({ id: t.id, title: t.title })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isApplied ? (
                    <p className="text-xs text-muted-foreground">
                      Para excluir, aplique outra planta nesta feira primeiro.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Nenhuma planta criada ainda.
          </div>
        )}
      </div>

      {/* Dialog Create */}
      <MapTemplateMetaDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        mode="create"
      />

      {/* Dialog Edit (sem fetch) */}
      {editTemplate ? (
        <MapTemplateMetaDialog
          open={!!editTemplate}
          onOpenChange={(v) => {
            if (!v) setEditTemplate(null);
          }}
          mode="edit"
          initial={editTemplate}
        />
      ) : null}

      {/* Confirm delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir planta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir{" "}
              <span className="font-medium">{deleteTarget?.title}</span>. Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={del.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {del.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
