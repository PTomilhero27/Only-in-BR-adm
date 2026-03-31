/**
 * map-utils.ts
 *
 * Funções utilitárias puras do editor de mapa.
 * Nenhuma dependência de React — pode ser testado isoladamente.
 */

import type { MapElement, MapTool } from "../../types/types";

// ───────────────────────── Helpers genéricos ─────────────────────────

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function snapInt(n: number) {
  return Math.round(n);
}

export function newClientId(prefix = "el") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ───────────────────────── Geometria ─────────────────────────

export function offsetLinePoints(points: number[], dx: number, dy: number) {
  return points.map((v, idx) => (idx % 2 === 0 ? v + dx : v + dy));
}

export function collidesRect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

// ───────────────────────── Booth helpers ─────────────────────────

/**
 * BOOTH paste "em sequência" (grid-like)
 */
export function findNextGridSpotForBooth(params: {
  baseX: number;
  baseY: number;
  booths: Array<{ x: number; y: number; w: number; h: number }>;
  boothSize: number;
  gap: number;
}) {
  const { baseX, baseY, booths, boothSize, gap } = params;
  const step = boothSize + gap;

  for (let i = 1; i <= 250; i++) {
    const x = snapInt(baseX + step * i);
    const y = snapInt(baseY);
    const candidate = { x, y, w: boothSize, h: boothSize };
    const hasCollision = booths.some((b) => collidesRect(candidate, b));
    if (!hasCollision) return { x, y };
  }

  return { x: snapInt(baseX), y: snapInt(baseY + step) };
}

export type GenerateMode = "HORIZONTAL" | "VERTICAL" | "AUTO";

/**
 * Gera barracas (BOOTH_SLOT) dentro de uma área selecionada,
 * respeitando a rotação da área-base.
 */
export function buildBoothsInAreaRotated(params: {
  areaX: number;
  areaY: number;
  areaW: number;
  areaH: number;
  areaRotation: number;
  qty: number;
  boothSize: number;
  gap: number;
  mode: GenerateMode;
  getNextNumber: () => number;
  makeId: () => string;
}) {
  const qty = Math.max(1, Math.floor(params.qty));
  const boothSize = Math.max(10, snapInt(params.boothSize));
  const gap = Math.max(0, snapInt(params.gap));

  let areaW = Math.max(boothSize, snapInt(params.areaW));
  let areaH = Math.max(boothSize, snapInt(params.areaH));

  let cols = 1;
  let rows = 1;

  const step = boothSize + gap;

  const capacityCols = Math.max(1, Math.floor((areaW + gap) / step));
  const capacityRows = Math.max(1, Math.floor((areaH + gap) / step));

  if (params.mode === "HORIZONTAL") {
    cols = qty;
    rows = 1;
  } else if (params.mode === "VERTICAL") {
    cols = 1;
    rows = qty;
  } else {
    cols = Math.min(capacityCols, qty);
    rows = Math.ceil(qty / cols);
  }

  const requiredW = cols * boothSize + (cols - 1) * gap;
  const requiredH = rows * boothSize + (rows - 1) * gap;

  areaW = Math.max(areaW, requiredW);
  areaH = Math.max(areaH, requiredH);

  const rad = ((params.areaRotation ?? 0) * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const vx = -Math.sin(rad);
  const vy = Math.cos(rad);

  const padX = (areaW - requiredW) / 2;
  const padY = (areaH - requiredH) / 2;

  const booths: MapElement[] = [];

  for (let i = 0; i < qty; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;

    const localX = padX + c * step;
    const localY = padY + r * step;

    const x = snapInt(params.areaX + localX * ux + localY * vx);
    const y = snapInt(params.areaY + localX * uy + localY * vy);

    booths.push({
      id: params.makeId(),
      type: "BOOTH_SLOT",
      x,
      y,
      rotation: params.areaRotation ?? 0,
      width: boothSize,
      height: boothSize,
      style: {
        fill: "#FEF9C3",
        stroke: "#CA8A04",
        strokeWidth: 2,
        opacity: 0.85,
      },
      isLinkable: true,
      number: params.getNextNumber(),
    } as any);
  }

  return {
    booths,
    expandedArea: { w: areaW, h: areaH },
    grid: { cols, rows, capacityCols, capacityRows },
  };
}

/**
 * Reorganiza a numeração das barracas para manter sequência contínua 1..N.
 */
export function renumberBooths(elements: MapElement[]): MapElement[] {
  const booths = elements
    .filter((e) => e.type === "BOOTH_SLOT")
    .map((e) => e as any);

  if (booths.length === 0) return elements;

  const sorted = [...booths].sort((a, b) => {
    const na = typeof a.number === "number" ? a.number : Number.MAX_SAFE_INTEGER;
    const nb = typeof b.number === "number" ? b.number : Number.MAX_SAFE_INTEGER;
    if (na !== nb) return na - nb;
    return String(a.id).localeCompare(String(b.id));
  });

  const nextNumberById = new Map<string, number>();
  sorted.forEach((b, idx) => nextNumberById.set(String(b.id), idx + 1));

  return elements.map((el) => {
    if (el.type !== "BOOTH_SLOT") return el;
    const next = nextNumberById.get(el.id);
    if (!next) return el;
    return { ...(el as any), number: next } as any;
  });
}

/**
 * Calcula o próximo número disponível para uma nova barraca.
 */
export function getNextBoothNumberFrom(elements: MapElement[]) {
  const max = elements
    .filter((e) => e.type === "BOOTH_SLOT")
    .reduce(
      (acc, e: any) =>
        Math.max(acc, typeof e.number === "number" ? e.number : 0),
      0,
    );

  return Math.max(1, max + 1);
}

// ───────────────────────── Seleção ─────────────────────────

/**
 * Usa o próprio `type` como chave do grupo de seleção.
 */
export function getSelectionGroupKey(el: MapElement) {
  return el.type;
}

export function selectionIsHomogeneous(elements: MapElement[], selectedIds: string[]) {
  const selected = elements.filter((e) => selectedIds.includes(e.id));
  if (selected.length <= 1) return true;
  const k = getSelectionGroupKey(selected[0]);
  return selected.every((e) => getSelectionGroupKey(e) === k);
}

// ───────────────────────── Hotkeys ─────────────────────────

export const toolByHotkey: Record<string, MapTool> = {
  "1": "SELECT",
  "2": "BOOTH",
  "3": "RECT",
  "4": "SQUARE",
  "5": "LINE",
  "6": "TEXT",
  "7": "TREE",
  "8": "CIRCLE",
};

// ───────────────────────── Style ─────────────────────────

export function normalizeStyle(style: unknown) {
  const fallback = {
    fill: "#CBD5E1",
    stroke: "#0F172A",
    strokeWidth: 2,
    opacity: 0.65,
  };

  if (!style || typeof style !== "object") return fallback;

  const s = style as any;
  return {
    fill: typeof s.fill === "string" ? s.fill : fallback.fill,
    stroke: typeof s.stroke === "string" ? s.stroke : fallback.stroke,
    strokeWidth:
      typeof s.strokeWidth === "number" ? s.strokeWidth : fallback.strokeWidth,
    opacity: typeof s.opacity === "number" ? s.opacity : fallback.opacity,
  };
}

// ───────────────────────── Error ─────────────────────────

export function getErrorMessage(err: unknown) {
  if (!err) return "Erro inesperado.";
  if (typeof err === "string") return err;

  if (typeof err === "object" && err !== null) {
    const anyErr = err as any;
    return (
      anyErr?.message ??
      anyErr?.response?.message ??
      anyErr?.response?.error ??
      "Erro inesperado."
    );
  }

  return "Erro inesperado.";
}

// ───────────────────────── Canvas safe helpers ─────────────────────────

/**
 * Normaliza number: evita NaN, aplica fallback
 */
export function safeNumber(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Normaliza style no canvas: evita crashes quando style vier null/undefined
 */
export function safeStyle(style: any) {
  const fallback = {
    fill: "#CBD5E1",
    stroke: "#0F172A",
    strokeWidth: 2,
    opacity: 0.75,
  };

  if (!style || typeof style !== "object") return fallback;

  return {
    fill: typeof style.fill === "string" ? style.fill : fallback.fill,
    stroke: typeof style.stroke === "string" ? style.stroke : fallback.stroke,
    strokeWidth:
      typeof style.strokeWidth === "number"
        ? style.strokeWidth
        : fallback.strokeWidth,
    opacity:
      typeof style.opacity === "number" ? style.opacity : fallback.opacity,
  };
}
