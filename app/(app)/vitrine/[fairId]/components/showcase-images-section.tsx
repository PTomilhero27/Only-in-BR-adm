"use client";

/**
 * Seção de imagens da vitrine.
 *
 * - Upload de imagem de capa
 * - Upload de imagens da galeria
 * - Preview + remoção individual
 *
 * Fluxo:
 * 1. Upload do arquivo via POST /fair-showcase/:fairId/upload
 * 2. Recebe URL pública
 * 3. Salva a URL via PATCH (coverImageUrl ou galleryImageUrls)
 */

import { useRef, useState } from "react";
import { ImagePlus, Save, Trash2, Upload, Image as ImageIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  useUploadShowcaseImageMutation,
  useUpdateShowcaseMutation,
} from "@/app/modules/fair-showcase/showcase.queries";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import type { Showcase } from "@/app/modules/fair-showcase/showcase.schema";

export function ShowcaseImagesSection({
  fairId,
  showcase,
  disabled = false,
}: {
  fairId: string;
  showcase: Showcase;
  disabled?: boolean;
}) {
  const uploadMutation = useUploadShowcaseImageMutation(fairId);
  const updateMutation = useUpdateShowcaseMutation(fairId);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  /**
   * Upload de capa: upload → PATCH coverImageUrl
   */
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const result = await uploadMutation.mutateAsync(file);
      await updateMutation.mutateAsync({ coverImageUrl: result.url });
      toast.success({ title: "Capa atualizada!" });
    } catch (err) {
      toast.error({ title: "Erro no upload", subtitle: getErrorMessage(err) });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  /**
   * Upload de imagem da galeria: upload → PATCH galleryImageUrls (append)
   */
  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingGallery(true);
    try {
      const result = await uploadMutation.mutateAsync(file);
      const updated = [...(showcase.galleryImageUrls ?? []), result.url];
      await updateMutation.mutateAsync({ galleryImageUrls: updated });
      toast.success({ title: "Imagem adicionada à galeria!" });
    } catch (err) {
      toast.error({ title: "Erro no upload", subtitle: getErrorMessage(err) });
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  /**
   * Remover imagem da galeria
   */
  function handleRemoveGalleryImage(url: string) {
    const updated = (showcase.galleryImageUrls ?? []).filter((u) => u !== url);
    updateMutation.mutate(
      { galleryImageUrls: updated },
      {
        onSuccess: () => toast.success({ title: "Imagem removida da galeria" }),
        onError: (err) =>
          toast.error({ title: "Erro", subtitle: getErrorMessage(err) }),
      },
    );
  }

  /**
   * Remover capa
   */
  function handleRemoveCover() {
    updateMutation.mutate(
      { coverImageUrl: "" },
      {
        onSuccess: () => toast.success({ title: "Capa removida" }),
        onError: (err) =>
          toast.error({ title: "Erro", subtitle: getErrorMessage(err) }),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4 text-purple-500" />
          Imagens
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Imagem de Capa ── */}
        <div className="space-y-3">
          <Label>Imagem de Capa</Label>

          {showcase.coverImageUrl ? (
            <div className="group relative overflow-hidden rounded-lg border">
              <img
                src={showcase.coverImageUrl}
                alt="Capa da vitrine"
                className="h-48 w-full object-cover"
              />
              {!disabled && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    Trocar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveCover}
                    disabled={updateMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remover
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={disabled || uploadingCover}
              className="flex h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/20 transition-colors hover:border-pink-500/40 hover:bg-pink-500/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
              <span className="mt-2 text-xs text-muted-foreground">
                {uploadingCover ? "Enviando…" : "Clique para adicionar a capa"}
              </span>
            </button>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleCoverUpload}
          />
        </div>

        {/* ── Galeria ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Galeria de Imagens</Label>
            {!disabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
              >
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                {uploadingGallery ? "Enviando…" : "Adicionar imagem"}
              </Button>
            )}
          </div>

          {(showcase.galleryImageUrls ?? []).length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {(showcase.galleryImageUrls ?? []).map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="group relative overflow-hidden rounded-lg border"
                >
                  <img
                    src={url}
                    alt={`Galeria ${i + 1}`}
                    className="h-28 w-full object-cover"
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(url)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted-foreground/15 bg-muted/10 p-6 text-center">
              <p className="text-xs text-muted-foreground/60">
                Nenhuma imagem na galeria
              </p>
            </div>
          )}

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleGalleryUpload}
          />
        </div>
      </CardContent>
    </Card>
  );
}
