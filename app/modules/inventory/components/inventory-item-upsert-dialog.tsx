"use client";

/**
 * Dialog de cadastro/edição de item.
 *
 * Responsabilidade:
 * - Coletar dados básicos do item de estoque.
 * - Validar campos essenciais antes de chamar as mutations.
 * - Exibir feedback em português para sucesso e falha.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Camera, Upload, Link, Trash2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";

import {
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useInventoryCategoriesQuery,
} from "../inventory.queries";
import {
  inventoryItemStatusLabels,
  type InventoryItem,
  type InventoryItemStatus,
} from "../types";


type FormState = {
  name: string;
  category: string;
  categoryIds: string[];
  unit: string;
  imageUrl: string;
  location: string;
  initialQty: string;
  minQty: string;
  status: InventoryItemStatus;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  category: "",
  categoryIds: [],
  unit: "UN",
  imageUrl: "",
  location: "",
  initialQty: "0",
  minQty: "0",
  status: "IN_STOCK",
  notes: "",
};

export function InventoryItemUpsertDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categorySearch, setCategorySearch] = useState("");


  const { data: categories = [] } = useInventoryCategoriesQuery();
  const createMutation = useCreateInventoryItemMutation();
  const updateMutation = useUpdateInventoryItemMutation();
  const isEditing = Boolean(item);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [imageMode, setImageMode] = useState<"url" | "upload" | "camera">("url");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  async function startCamera() {
    try {
      setCameraError(null);
      if (!window.isSecureContext) {
        setCameraError(
          "O acesso à câmera exige uma conexão segura (HTTPS ou localhost). Verifique o endereço da página."
        );
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Seu navegador ou dispositivo não oferece suporte para acesso à câmera."
        );
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.error(err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Acesso negado. Por favor, permita o acesso à câmera nas configurações do seu navegador para esta página."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError(
          "Nenhuma câmera foi encontrada ou detectada neste dispositivo."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError(
          "A câmera já está sendo usada por outro aplicativo ou aba."
        );
      } else {
        setCameraError(
          `Erro ao acessar a câmera: ${err.message || "verifique as permissões de acesso."}`
        );
      }
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm(
      item
        ? {
            name: item.name,
            category: item.category ?? "",
            categoryIds: item.categories?.map((c) => c.id) ?? [],
            unit: item.unit || "UN",
            imageUrl: item.imageUrl ?? "",
            location: item.location ?? "",
            initialQty: String(item.currentQty ?? 0),
            minQty: String(item.minQty ?? 0),
            status: item.status,
            notes: item.notes ?? "",
          }
        : emptyForm,
    );
    setCategorySearch("");
    if (item?.imageUrl) {
      if (item.imageUrl.startsWith("data:")) {
        setImageMode("upload");
      } else {
        setImageMode("url");
      }
    } else {
      setImageMode("url");
    }
  }, [item, open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.warning({ title: "Informe o nome do item." });
      return;
    }

    const minQty = Number(form.minQty);
    const initialQty = Number(form.initialQty);

    if (Number.isNaN(minQty) || minQty < 0) {
      toast.warning({ title: "Quantidade mínima inválida." });
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        category: categories.find(c => form.categoryIds.includes(c.id))?.name || null,
        categoryIds: form.categoryIds,
        unit: form.unit.trim() || "UN",
        imageUrl: form.imageUrl.trim() || null,
        location: null,
        minQty,
        status: form.status,
        notes: form.notes.trim() || null,
        ...(!isEditing ? { initialQty: Math.max(initialQty || 0, 0) } : {}),
      };

      if (item) {
        await updateMutation.mutateAsync({ id: item.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      toast.success({
        title: isEditing ? "Item atualizado" : "Item cadastrado",
        subtitle: "O estoque foi sincronizado com a API.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error({ title: "Erro ao salvar item", subtitle: getErrorMessage(error) });
    }
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const selectedCategoryNames = categories
    .filter((c) => form.categoryIds.includes(c.id))
    .map((c) => c.name)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar item" : "Adicionar item"}</DialogTitle>
          <DialogDescription>
            Informe os dados usados para controlar quantidade, localização e alertas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Categorias">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between text-left font-normal border-input"
                >
                  <span className="truncate">
                    {selectedCategoryNames || "Selecionar categorias..."}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-2" align="start">
                <div className="space-y-2">
                  <Input
                    placeholder="Pesquisar categoria..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-8"
                  />
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {filteredCategories.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground p-3">
                        Nenhuma categoria encontrada.
                      </p>
                    ) : (
                      filteredCategories.map((category) => {
                        const checked = form.categoryIds.includes(category.id);
                        return (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 rounded-md p-2 hover:bg-slate-100/50 cursor-pointer select-none"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {
                                if (checked) {
                                  update(
                                    "categoryIds",
                                    form.categoryIds.filter((id) => id !== category.id)
                                  );
                                } else {
                                  update("categoryIds", [...form.categoryIds, category.id]);
                                }
                              }}
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {category.name}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </Field>
          <Field label="Unidade">
            <Input value={form.unit} onChange={(e) => update("unit", e.target.value)} />
          </Field>
          {!isEditing ? (
            <Field label="Quantidade inicial">
              <Input
                type="number"
                min={0}
                value={form.initialQty}
                onChange={(e) => update("initialQty", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Quantidade mínima">
            <Input
              type="number"
              min={0}
              value={form.minQty}
              onChange={(e) => update("minQty", e.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(value) => update("status", value as InventoryItemStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(inventoryItemStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2 space-y-2">
            <Label>Imagem do item</Label>
            <div className="flex flex-wrap gap-2 border-b pb-2 mb-2">
              <Button
                type="button"
                variant={imageMode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  stopCamera();
                  setImageMode("url");
                }}
                className="gap-1.5"
              >
                <Link className="h-3.5 w-3.5" />
                URL da Imagem
              </Button>
              <Button
                type="button"
                variant={imageMode === "upload" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  stopCamera();
                  setImageMode("upload");
                }}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload do Computador
              </Button>
              <Button
                type="button"
                variant={imageMode === "camera" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setImageMode("camera");
                  startCamera();
                }}
                className="gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                Tirar Foto
              </Button>
            </div>

            {form.imageUrl && (
              <div className="relative flex items-center justify-center border rounded-lg bg-slate-50 p-2 max-w-[200px] h-[120px] mb-2 group">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition duration-150"
                  onClick={() => update("imageUrl", "")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {imageMode === "url" && (
              <Input
                placeholder="https://exemplo.com/foto.jpg"
                value={form.imageUrl}
                onChange={(e) => update("imageUrl", e.target.value)}
              />
            )}

            {imageMode === "upload" && (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-slate-600">
                      <span className="font-semibold">Clique para fazer upload</span> ou arraste
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (Max. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          update("imageUrl", reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {imageMode === "camera" && (
              <div className="space-y-3">
                {cameraError ? (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                    {cameraError}
                  </div>
                ) : stream ? (
                  <div className="relative rounded-lg overflow-hidden border bg-black aspect-video max-w-md mx-auto">
                    <video
                      ref={(ref) => {
                        if (ref && stream) {
                          ref.srcObject = stream;
                          ref.play().catch(console.error);
                        }
                      }}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                      <Button
                        type="button"
                        onClick={() => {
                          const video = document.querySelector("video");
                          if (video) {
                            const canvas = document.createElement("canvas");
                            canvas.width = video.videoWidth || 640;
                            canvas.height = video.videoHeight || 480;
                            const ctx = canvas.getContext("2d");
                            if (ctx) {
                              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                              const dataUrl = canvas.toDataURL("image/jpeg");
                              update("imageUrl", dataUrl);
                              stopCamera();
                            }
                          }
                        }}
                        className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 h-9 shadow-lg gap-1.5"
                      >
                        <Camera className="h-4 w-4" />
                        Capturar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 border rounded-lg bg-slate-50">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startCamera}
                      className="gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Ativar Câmera
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Field label="Observações">
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
      
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
