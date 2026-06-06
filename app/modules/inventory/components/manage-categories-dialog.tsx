"use client";

import { useState } from "react";
import { Trash2, Plus, Sparkles, FolderClosed } from "lucide-react";

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
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";

import {
  useInventoryCategoriesQuery,
  useCreateInventoryCategoryMutation,
  useDeleteInventoryCategoryMutation,
} from "../inventory.queries";

export function ManageCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const { data: categories = [], isLoading } = useInventoryCategoriesQuery();
  const createMutation = useCreateInventoryCategoryMutation();
  const deleteMutation = useDeleteInventoryCategoryMutation();

  async function handleCreate() {
    if (!name.trim()) {
      toast.warning({ title: "Informe o nome da categoria." });
      return;
    }

    try {
      await createMutation.mutateAsync(name.trim());
      toast.success({ title: "Categoria criada com sucesso!" });
      setName("");
    } catch (error) {
      toast.error({ title: "Erro ao criar categoria", subtitle: getErrorMessage(error) });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success({ title: "Categoria deletada com sucesso!" });
    } catch (error) {
      toast.error({
        title: "Erro ao deletar categoria",
        subtitle: getErrorMessage(error) || "Verifique se a categoria está associada a algum produto.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </div>
          <DialogDescription>
            Adicione novas categorias ou exclua as existentes. Categorias vinculadas a produtos não podem ser excluídas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Formulário de Criação */}
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bebidas, Embalagens..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate();
                }
              }}
              disabled={createMutation.isPending}
            />
            <Button onClick={handleCreate} disabled={createMutation.isPending} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de Categorias */}
          <div className="rounded-lg border bg-slate-50/50 p-1">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Carregando categorias...
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FolderClosed className="h-8 w-8 mb-2 stroke-[1.5]" />
                <span className="text-sm">Nenhuma categoria cadastrada</span>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-100/50 transition-colors"
                  >
                    <span className="font-medium text-sm text-slate-700">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(category.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
