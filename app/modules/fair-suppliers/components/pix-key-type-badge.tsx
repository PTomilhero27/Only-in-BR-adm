import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type PixKeyType } from "../types";

export function formatPixKeyTypeLabel(type?: PixKeyType | null): string {
  if (!type) return "Não identificado";
  
  const map: Record<PixKeyType, string> = {
    CPF: "CPF",
    CNPJ: "CNPJ",
    EMAIL: "E-mail",
    PHONE: "Telefone",
    RANDOM: "Chave aleatória",
  };
  
  return map[type] || String(type);
}

type Props = {
  type?: PixKeyType | null;
  className?: string;
};

export function PixKeyTypeBadge({ type, className }: Props) {
  if (!type) {
    return (
      <Badge
        variant="outline"
        className={cn("whitespace-nowrap border-amber-200 bg-amber-50 text-amber-700", className)}
      >
        Não identificado
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap border-indigo-200 bg-indigo-50 text-indigo-700", className)}
    >
      {formatPixKeyTypeLabel(type)}
    </Badge>
  );
}
