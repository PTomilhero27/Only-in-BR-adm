/**
 * map-serialization.ts
 *
 * Funções de conversão entre o formato da API (MapTemplateElement)
 * e o formato interno do canvas (MapElement).
 *
 * Responsabilidades:
 * - canvasElementToTemplateElement: Canvas → API (para salvar)
 * - adaptTemplateElementToCanvasElement: API → Canvas (para carregar)
 */

import type { MapElement } from "../../types/types";
import type { MapTemplateElement } from "@/app/modules/mapa-templates/map-templates.schema";
import { normalizeStyle } from "./map-utils";

/**
 * Serializa o elemento do canvas para o formato esperado pela API de templates.
 */
export function canvasElementToTemplateElement(el: MapElement) {
  if (el.type === "LINE") {
    return {
      clientKey: el.id,
      type: "LINE" as const,
      x: 0,
      y: 0,
      rotation: el.rotation ?? 0,
      points: (el as any).points ?? [],
      style: normalizeStyle((el as any).style),
    };
  }

  if (el.type === "TREE") {
    return {
      clientKey: el.id,
      type: "TREE" as const,
      x: el.x,
      y: el.y,
      rotation: el.rotation ?? 0,
      radius: (el as any).radius ?? 14,
      label: (el as any).label ?? null,
      style: normalizeStyle((el as any).style),
    };
  }

  if (el.type === "CIRCLE") {
    return {
      clientKey: el.id,
      type: "CIRCLE" as const,
      x: el.x,
      y: el.y,
      rotation: el.rotation ?? 0,
      radius: Number((el as any).radius ?? 45),
      label: (el as any).label ?? null,
      style: normalizeStyle((el as any).style),
      isLinkable: false,
    };
  }

  if (el.type === "TEXT") {
    const baseStyle = normalizeStyle((el as any).style);
    const text = String((el as any).text ?? "").trim() || "Texto";
    const fontSize = Number((el as any).fontSize ?? 18);
    const boxed = Boolean((el as any).boxed ?? true);
    const padding = Number((el as any).padding ?? 10);
    const borderRadius = Number((el as any).borderRadius ?? 10);

    return {
      clientKey: el.id,
      type: "TEXT" as const,
      x: el.x,
      y: el.y,
      rotation: el.rotation ?? 0,
      label: text,
      style: {
        ...baseStyle,
        fontSize,
        boxed,
        padding,
        borderRadius,
      } as any,
      isLinkable: false,
    };
  }

  if (el.type === "RECT" || el.type === "SQUARE" || el.type === "BOOTH_SLOT") {
    const isBooth = el.type === "BOOTH_SLOT";

    return {
      clientKey: el.id,
      type: el.type,
      x: el.x ?? 0,
      y: el.y ?? 0,
      rotation: el.rotation ?? 0,
      width: Number((el as any).width ?? 60),
      height: Number((el as any).height ?? 60),
      label: isBooth ? null : ((el as any).label ?? "Área"),
      number: isBooth ? ((el as any).number ?? null) : null,
      isLinkable: isBooth ? Boolean((el as any).isLinkable ?? true) : false,
      style: normalizeStyle((el as any).style),
    };
  }

  const _exhaustiveCheck: never = el;
  throw new Error(`Tipo de elemento não suportado: ${JSON.stringify(_exhaustiveCheck)}`);
}

/**
 * Adapter: backend element -> canvas element
 *
 * Converte o payload da API para o formato interno do canvas,
 * preservando o `type` real de cada elemento.
 *
 * Decisão importante:
 * - id no canvas = clientKey do backend
 * - assim mantemos estabilidade entre edição, save e reload
 */
export function adaptTemplateElementToCanvasElement(el: MapTemplateElement): MapElement {
  const style = normalizeStyle((el as any).style);
  const clientKey = (el as any).clientKey ?? (el as any).id;

  if ((el as any).type === "LINE") {
    return {
      id: clientKey,
      clientKey,
      type: "LINE",
      x: 0,
      y: 0,
      rotation: (el as any).rotation ?? 0,
      style,
      points: ((el as any).points ?? []) as number[],
    } as any;
  }

  if ((el as any).type === "TEXT") {
    const text =
      String((el as any).text ?? (el as any).label ?? "").trim() || "Texto";
    const fontSize = Number(
      (el as any).fontSize ?? (el as any)?.style?.fontSize ?? 18,
    );

    return {
      id: clientKey,
      clientKey,
      type: "TEXT",
      x: (el as any).x ?? 0,
      y: (el as any).y ?? 0,
      rotation: (el as any).rotation ?? 0,
      style,
      text,
      fontSize,
      boxed: Boolean((el as any).boxed ?? (el as any)?.style?.boxed ?? true),
      padding: Number((el as any).padding ?? (el as any)?.style?.padding ?? 10),
      borderRadius: Number(
        (el as any).borderRadius ?? (el as any)?.style?.borderRadius ?? 10,
      ),
    } as any;
  }

  if ((el as any).type === "TREE") {
    return {
      id: clientKey,
      clientKey,
      type: "TREE",
      x: (el as any).x ?? 0,
      y: (el as any).y ?? 0,
      rotation: (el as any).rotation ?? 0,
      style,
      radius: Number((el as any).radius ?? 14),
      label: (el as any).label ?? undefined,
    } as any;
  }

  if ((el as any).type === "CIRCLE") {
    return {
      id: clientKey,
      clientKey,
      type: "CIRCLE",
      x: (el as any).x ?? 0,
      y: (el as any).y ?? 0,
      rotation: (el as any).rotation ?? 0,
      style,
      radius: Number((el as any).radius ?? 45),
      label: (el as any).label ?? undefined,
    } as any;
  }

  if ((el as any).type === "BOOTH_SLOT") {
    return {
      id: clientKey,
      clientKey,
      type: "BOOTH_SLOT",
      x: Number((el as any).x ?? 0),
      y: Number((el as any).y ?? 0),
      rotation: Number((el as any).rotation ?? 0),
      style,
      width: Number((el as any).width ?? 60),
      height: Number((el as any).height ?? 60),
      isLinkable: Boolean((el as any).isLinkable ?? true),
      number: (el as any).number ?? undefined,
      label: undefined,
    } as any;
  }

  if ((el as any).type === "SQUARE") {
    return {
      id: clientKey,
      clientKey,
      type: "SQUARE",
      x: Number((el as any).x ?? 0),
      y: Number((el as any).y ?? 0),
      rotation: Number((el as any).rotation ?? 0),
      style,
      width: Number((el as any).width ?? 60),
      height: Number((el as any).height ?? 60),
      label: (el as any).label ?? "",
    } as any;
  }

  // Fallback: RECT
  return {
    id: clientKey,
    clientKey,
    type: "RECT",
    x: Number((el as any).x ?? 0),
    y: Number((el as any).y ?? 0),
    rotation: Number((el as any).rotation ?? 0),
    style,
    width: Number((el as any).width ?? 60),
    height: Number((el as any).height ?? 60),
    label: (el as any).label ?? "",
  } as any;
}
