import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Card (tile) compacto e padronizado do Dashboard.
 *
 * Regras de UI:
 * - Todos os tiles devem ter o MESMO tamanho visual (altura consistente).
 * - Todos devem mostrar cursor pointer.
 * - A faixa lateral "acende" no hover (fica mais viva).
 *
 * Decisão:
 * - Usamos `min-h-[140px]` como base (ajustável).
 * - O conteúdo interno é organizado para não "esticar" a altura por diferenças de texto.
 */
export function DashboardTile(props: {
  title: string;
  description?: string;

  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;

  accentClassName?: string; // ex.: "bg-blue-500"
  children?: React.ReactNode;

  href?: string;
  onClick?: () => void;
}) {
  const {
    title,
    description,
    icon,
    rightSlot,
    accentClassName = "bg-muted",
    children,
    href,
    onClick,
  } = props;

  const content = (
    <Card className="group relative h-full min-h-[140px] overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Faixa lateral (mais viva) + brilho animado no hover */}
      <div className={`absolute left-0 top-0 h-full w-1 ${accentClassName} opacity-90 transition-all duration-200 group-hover:w-1.5 group-hover:opacity-100`} />

      {/* Brilho animado (aparece só no hover) */}
      <div
        className={[
          "pointer-events-none absolute left-0 top-0 h-full w-1.5",
          // O brilho é um gradiente que percorre a altura
          "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          // Gradiente branco/transparente para dar sensação de brilho
          "bg-gradient-to-b from-white/0 via-white/45 to-white/0",
          // Animação vertical infinita
          "animate-[dashGlow_1.2s_ease-in-out_infinite]",
        ].join(" ")}
      />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="mt-0.5 rounded-md border bg-background p-2 shadow-sm transition group-hover:shadow">
              {icon}
            </div>
          ) : null}

          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>

            {/* Limita a descrição para evitar variação de altura */}
            {description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {rightSlot ? <div className="pt-0.5">{rightSlot}</div> : null}
      </CardHeader>

      {/* Conteúdo sempre “ancorado” embaixo pra ficar consistente */}
      <CardContent className="flex h-full flex-col justify-end pt-0">
        <div className="mt-2">{children}</div>
      </CardContent>
    </Card>
  );

  // Link (sempre com cursor e foco)
  if (href) {
    return (
      <Link
        href={href}
        className="block h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  // Ação (sempre com cursor e foco)
  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </button>
  );
}
