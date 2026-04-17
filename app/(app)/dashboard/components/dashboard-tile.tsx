import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardTileProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  accentClassName?: string;
  children?: React.ReactNode;
  footer?: string;
  className?: string;
  href?: string;
  onClick?: () => void;
};

export function DashboardTile({
  title,
  description,
  eyebrow,
  icon,
  rightSlot,
  accentClassName = "bg-primary",
  children,
  footer,
  className,
  href,
  onClick,
}: DashboardTileProps) {
  const content = (
    <Card
      className={cn(
        "group relative h-full min-h-[230px] overflow-hidden rounded-lg border border-border bg-white py-0 transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_28px_48px_-36px_rgba(1,0,119,0.16)]",
        className
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1", accentClassName)} />

      <CardContent className="relative flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("block h-2.5 w-2.5 rounded-full", accentClassName)} />

            {eyebrow ? (
              <span className="font-display rounded-md border border-border bg-muted px-3 py-1 text-[11px] text-primary/72">
                {eyebrow}
              </span>
            ) : null}
          </div>

          {rightSlot ? (
            <div className="shrink-0">{rightSlot}</div>
          ) : (
            <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-primary/40 transition duration-200 group-hover:border-primary/20 group-hover:text-primary">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-start gap-4">
          {icon ? (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-primary">
              {icon}
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-[1.55rem] leading-none text-primary">
              {title}
            </h3>
            {description ? (
              <p className="max-w-[30ch] text-[15px] leading-7 text-primary/72">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {children ? <div className="mt-6">{children}</div> : null}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-5">
          <span className="text-sm text-primary/64">
            {footer ?? "Abrir area"}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md border border-border bg-white text-primary transition duration-200 group-hover:border-primary/20 group-hover:bg-muted">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </button>
  );
}
