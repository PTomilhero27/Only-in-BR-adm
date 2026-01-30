"use client";

/**
 * AppBreadcrumb
 *
 * Responsabilidade:
 * - Exibir breadcrumb padronizado para páginas do painel
 * - Simplificar uso do componente Breadcrumb do shadcn
 *
 * Convenções:
 * - Último item é a página atual (não clicável)
 * - Separador fica ENTRE itens (evita <li> dentro de <li>)
 */

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

type BreadcrumbItemType = {
  label: string;
  href?: string;
};

type AppBreadcrumbProps = {
  items: BreadcrumbItemType[];
};

export function AppBreadcrumb({ items }: AppBreadcrumbProps) {
  if (!items?.length) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            // Fragment para permitir inserir o separator como "irmão"
            <span key={`${item.label}-${index}`} className="contents">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href ?? "#"}>
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {!isLast ? <BreadcrumbSeparator /> : null}
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
