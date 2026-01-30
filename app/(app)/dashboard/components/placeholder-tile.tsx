import { DashboardTile } from "./dashboard-tile";

/**
 * Tile placeholder (compacto) para módulos ainda não definidos.
 * Mantém a UI pronta sem forçar decisões agora.
 */
export function PlaceholderTile(props: {
  title: string;
  description?: string;
  href: string;
  label: string;
}) {
  const { title, description, href, label } = props;

  return (
    <DashboardTile title={title} description={description} href={href}>
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {label}
      </div>
    </DashboardTile>
  );
}
