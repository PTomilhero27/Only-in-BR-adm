"use client";

import * as React from "react";

import type { MapElement, MapTool } from "../../types/types";

import { FairMap2DCanvas } from "./fair-map-2d-canvas";
import { LegendPanel } from "./legend-panel";
import { MapInspectorPanel } from "./map-inspector-panel";
import { MapToolsPanel } from "./map-tools-panel";

import { MapHeader } from "./map-header";
import { MapSettingsDialog } from "./map-settings-dialog";
import { GenerateBoothsDialog } from "./generate-booths-dialog";
import { BoothSlotLinkDialog } from "./booth-slot-link-dialog";

import {
  fairMapsQueryKeys,
  useFairMapQuery,
} from "@/app/modules/fair-maps/fair-maps.queries";
import { MapTemplateElement } from "@/app/modules/mapa-templates/map-templates.schema";
import {
  mapTemplatesKeys,
  useUpdateMapTemplateMutation,
} from "@/app/modules/mapa-templates/map-templates.queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";

/**
 * Undo/Redo simples
 */
type UndoState<T> = { past: T[]; present: T; future: T[] };

function applySetStateAction<T>(prev: T, action: React.SetStateAction<T>): T {
  return typeof action === "function"
    ? (action as (prev: T) => T)(prev)
    : action;
}

function useUndoRedo<T>(initial: T) {
  const [state, setState] = React.useState<UndoState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const set = React.useCallback((action: React.SetStateAction<T>) => {
    setState((prev) => {
      const next = applySetStateAction(prev.present, action);
      if (Object.is(next, prev.present)) return prev;
      return { past: [...prev.past, prev.present], present: next, future: [] };
    });
  }, []);

  const undo = React.useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = React.useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const reset = React.useCallback((next: T) => {
    setState({ past: [], present: next, future: [] });
  }, []);

  return { state, set, reset, undo, redo };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function offsetLinePoints(points: number[], dx: number, dy: number) {
  return points.map((v, idx) => (idx % 2 === 0 ? v + dx : v + dy));
}

function newClientId(prefix = "el") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function snapInt(n: number) {
  return Math.round(n);
}

function collidesRect(
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

/**
 * BOOTH paste "em sequência" (grid-like)
 */
function findNextGridSpotForBooth(params: {
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

type GenerateMode = "HORIZONTAL" | "VERTICAL" | "AUTO";

/**
 * ✅ Gera BOOTHS dentro de uma área, respeitando rotação.
 */
function buildBoothsInAreaRotated(params: {
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
      type: "RECT",
      rectKind: "BOOTH",
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
 * ✅ Reorganiza os números das BOOTHS para ficarem 1..N sem buracos.
 */
function renumberBooths(elements: MapElement[]): MapElement[] {
  const booths = elements
    .filter((e) => e.type === "RECT" && (e as any).rectKind === "BOOTH")
    .map((e) => e as any);

  if (booths.length === 0) return elements;

  const sorted = [...booths].sort((a, b) => {
    const na =
      typeof a.number === "number" ? a.number : Number.MAX_SAFE_INTEGER;
    const nb =
      typeof b.number === "number" ? b.number : Number.MAX_SAFE_INTEGER;
    if (na !== nb) return na - nb;
    return String(a.id).localeCompare(String(b.id));
  });

  const nextNumberById = new Map<string, number>();
  sorted.forEach((b, idx) => nextNumberById.set(String(b.id), idx + 1));

  return elements.map((el) => {
    if (el.type !== "RECT" || (el as any).rectKind !== "BOOTH") return el;
    const next = nextNumberById.get(el.id);
    if (!next) return el;
    return { ...(el as any), number: next } as any;
  });
}

/**
 * ✅ Próximo número sempre “no final”
 */
function getNextBoothNumberFrom(elements: MapElement[]) {
  const max = elements
    .filter((e) => e.type === "RECT" && (e as any).rectKind === "BOOTH")
    .reduce(
      (acc, e: any) =>
        Math.max(acc, typeof e.number === "number" ? e.number : 0),
      0,
    );

  return Math.max(1, max + 1);
}

function getSelectionGroupKey(el: MapElement) {
  if (el.type === "RECT") return `RECT:${(el as any).rectKind ?? "RECT"}`;
  return el.type;
}

function selectionIsHomogeneous(elements: MapElement[], selectedIds: string[]) {
  const selected = elements.filter((e) => selectedIds.includes(e.id));
  if (selected.length <= 1) return true;
  const k = getSelectionGroupKey(selected[0]);
  return selected.every((e) => getSelectionGroupKey(e) === k);
}

/**
 * ✅ Ferramentas por hotkey (1..7)
 */
const toolByHotkey: Record<string, MapTool> = {
  "1": "SELECT",
  "2": "BOOTH",
  "3": "RECT",
  "4": "SQUARE",
  "5": "LINE",
  "6": "TEXT",
  "7": "TREE",
};

/**
 * Serializa o elemento do canvas para o formato esperado pela API de templates.
 *
 * Decisão:
 * - O backend atual não tem colunas específicas para TEXT (fontSize/boxed etc.).
 * - Para não perder contexto, salvamos:
 *   - label: texto do elemento
 *   - style: inclui propriedades extras (fontSize/boxed/padding/borderRadius) junto do style base
 */
function canvasElementToTemplateElement(el: MapElement) {
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
    };
  }

  // RECT
  const rectKind = (el as any).rectKind as "BOOTH" | "RECT" | "SQUARE";
  const type =
    rectKind === "BOOTH"
      ? ("BOOTH_SLOT" as const)
      : rectKind === "SQUARE"
        ? ("SQUARE" as const)
        : ("RECT" as const);

  const isBooth = rectKind === "BOOTH";

  return {
    clientKey: el.id,
    type,
    x: (el as any).x ?? 0,
    y: (el as any).y ?? 0,
    rotation: (el as any).rotation ?? 0,
    width: Number((el as any).width ?? 60),
    height: Number((el as any).height ?? 60),
    label: isBooth ? null : ((el as any).label ?? "Área"),
    number: isBooth ? ((el as any).number ?? null) : null,
    isLinkable: isBooth ? Boolean((el as any).isLinkable ?? true) : false,
    style: normalizeStyle((el as any).style),
  };
}

export function MapaClient({ fairId }: { fairId: string }) {
  const qc = useQueryClient();
  const fairMap = useFairMapQuery(fairId);

  const [tool, setTool] = React.useState<MapTool>("SELECT");
  const [isEditMode, setIsEditMode] = React.useState(true);

  // Config global para BOOTH (quadrado)
  const [boothConfig, setBoothConfig] = React.useState({
    boothSize: 70,
    gap: 8,
  });
  const boothConfigRef = React.useRef(boothConfig);
  React.useEffect(
    () => void (boothConfigRef.current = boothConfig),
    [boothConfig],
  );

  // Blueprint local
  const [localBlueprintUrl, setLocalBlueprintUrl] = React.useState<string | null>(
    null,
  );
  const [isBlueprintVisible, setIsBlueprintVisible] = React.useState(true);
  const [viewportToken, setViewportToken] = React.useState(0);

  // Settings Dialog
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Generate Booths Dialog
  const [genOpen, setGenOpen] = React.useState(false);

  /**
   * ✅ Modal operacional de vínculo BOOTH_SLOT ↔ StallFair.
   * - Só abrimos no modo operacional (Edit OFF).
   * - slotClientKey no backend = id do elemento (clientKey) no canvas.
   */
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [activeSlotClientKey, setActiveSlotClientKey] = React.useState<string | null>(
    null,
  );

  const isNotConfigured =
    (fairMap.error as any)?.statusCode === 404 ||
    (fairMap.error as any)?.status === 404;

  const templateBackgroundUrl = fairMap.data?.template?.backgroundUrl ?? null;
  const hasBlueprint = !!(localBlueprintUrl ?? templateBackgroundUrl);

  const backgroundUrl = isBlueprintVisible
    ? localBlueprintUrl ?? templateBackgroundUrl ?? undefined
    : undefined;

  /**
   * ✅ Links atuais do mapa (slotClientKey → stallFairId + resumo stallFair)
   */
  const linkedBoothIds = React.useMemo(() => {
    const ids = (fairMap.data?.links ?? []).map((l: any) =>
      String(l.slotClientKey),
    );
    return new Set(ids);
  }, [fairMap.data?.links]);

  const linkBySlotClientKey = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const l of fairMap.data?.links ?? []) {
      map.set(String((l as any).slotClientKey), l);
    }
    return map;
  }, [fairMap.data?.links]);

  const activeLink = React.useMemo(() => {
    if (!activeSlotClientKey) return null;
    return linkBySlotClientKey.get(activeSlotClientKey) ?? null;
  }, [activeSlotClientKey, linkBySlotClientKey]);

  const templateElements = fairMap.data?.template?.elements ?? [];

  const initialElements = React.useMemo<MapElement[]>(() => {
    const raw = templateElements as MapTemplateElement[];
    return raw.map((el) => adaptTemplateElementToCanvasElement(el));
  }, [templateElements]);

  const elementsState = useUndoRedo<MapElement[]>([]);
  const elements = elementsState.state.present;

  const setElements = React.useCallback<
    React.Dispatch<React.SetStateAction<MapElement[]>>
  >(
    (action) => elementsState.set(action),
    [elementsState],
  );

  React.useEffect(() => {
    elementsState.reset(initialElements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialElements)]);

  // ✅ MULTI selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const selected = React.useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return elements.find((e) => e.id === selectedIds[0]) ?? null;
  }, [elements, selectedIds]);

  const canTransform = React.useMemo(
    () => selectionIsHomogeneous(elements, selectedIds),
    [elements, selectedIds],
  );

  // cleanup blob
  React.useEffect(() => {
    return () => {
      if (localBlueprintUrl?.startsWith("blob:"))
        URL.revokeObjectURL(localBlueprintUrl);
    };
  }, [localBlueprintUrl]);

  function handlePickBlueprintFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error({
        title: "Arquivo inválido",
        subtitle: "Selecione um arquivo de imagem (png/jpg/webp).",
      });
      return;
    }
    if (localBlueprintUrl?.startsWith("blob:")) URL.revokeObjectURL(localBlueprintUrl);
    const url = URL.createObjectURL(file);
    setLocalBlueprintUrl(url);
    setIsBlueprintVisible(true);
    setViewportToken((v) => v + 1);
  }

  // ===== create tools =====
  const onCreateAtPoint = React.useCallback(
    (pt: { x: number; y: number }) => {
      if (!isEditMode) return;

      if (tool === "BOOTH") {
        const boothSize = boothConfigRef.current.boothSize;

        setElements((prev) => {
          const nextNumber = getNextBoothNumberFrom(prev);
          const booth: MapElement = {
            id: newClientId("booth"),
            type: "RECT",
            rectKind: "BOOTH",
            x: snapInt(pt.x),
            y: snapInt(pt.y),
            rotation: 0,
            width: boothSize,
            height: boothSize,
            style: {
              fill: "#FEF9C3",
              stroke: "#CA8A04",
              strokeWidth: 2,
              opacity: 0.85,
            },
            isLinkable: true,
            number: nextNumber,
          } as any;

          queueMicrotask(() => setSelectedIds([booth.id]));
          return [...prev, booth];
        });

        return;
      }

      if (tool === "RECT" || tool === "SQUARE") {
        const w = tool === "SQUARE" ? 90 : 140;
        const h = tool === "SQUARE" ? 90 : 90;

        const rect: MapElement = {
          id: newClientId("rect"),
          type: "RECT",
          rectKind: tool === "SQUARE" ? "SQUARE" : "RECT",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          width: w,
          height: h,
          style: {
            fill: "#E2E8F0",
            stroke: "#0F172A",
            strokeWidth: 2,
            opacity: 0.75,
          },
          label: "Área",
        } as any;

        setElements((prev) => [...prev, rect]);
        setSelectedIds([rect.id]);
        return;
      }

      if (tool === "TEXT") {
        const text: MapElement = {
          id: newClientId("text"),
          type: "TEXT",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          style: {
            fill: "#0F172A",
            stroke: "#0F172A",
            strokeWidth: 2,
            opacity: 1,
          },
          text: "Texto",
          fontSize: 18,
          boxed: true,
          padding: 10,
          borderRadius: 10,
        } as any;

        setElements((prev) => [...prev, text]);
        setSelectedIds([text.id]);
        return;
      }

      if (tool === "TREE") {
        const tree: MapElement = {
          id: newClientId("tree"),
          type: "TREE",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          style: {
            fill: "#BBF7D0",
            stroke: "#16A34A",
            strokeWidth: 2,
            opacity: 1,
          },
          radius: 18,
        } as any;

        setElements((prev) => [...prev, tree]);
        setSelectedIds([tree.id]);
        return;
      }

      // LINE é criado no canvas (click-and-click)
      if (tool === "LINE") return;
    },
    [isEditMode, setElements, tool],
  );

  // ===== hotkeys / copy paste / delete =====
  const copyRef = React.useRef<MapElement | null>(null);

  /**
   * Estado do desenho de linha (click and click)
   */
  const [lineDraft, setLineDraft] = React.useState<{
    active: boolean;
    points: number[];
    preview: { x: number; y: number } | null;
  }>({ active: false, points: [], preview: null });

  const removeLastLinePoint = React.useCallback(() => {
    setLineDraft((prev) => {
      if (!prev.active) return prev;
      const next = prev.points.slice(0, -2);
      if (next.length < 4) return { active: false, points: [], preview: null };
      return { ...prev, points: next };
    });
  }, []);

  const finishLineDraft = React.useCallback(() => {
    setLineDraft((prev) => {
      if (!prev.active) return prev;

      const pts = prev.points;
      if (pts.length >= 4) {
        const lineEl: MapElement = {
          id: newClientId("line"),
          type: "LINE",
          x: 0,
          y: 0,
          rotation: 0,
          style: {
            fill: "#000000",
            stroke: "#0F172A",
            strokeWidth: 3,
            opacity: 0.9,
          },
          points: pts,
        } as any;

        setElements((elsPrev) => [...elsPrev, lineEl]);
        queueMicrotask(() => setSelectedIds([lineEl.id]));
      }

      return { active: false, points: [], preview: null };
    });
  }, [setElements]);

  const cancelLineDraft = React.useCallback(() => {
    setLineDraft({ active: false, points: [], preview: null });
  }, []);

  const deleteSelectionAndRenumber = React.useCallback(() => {
    if (selectedIds.length === 0) return;
    setElements((prev) =>
      renumberBooths(prev.filter((el) => !selectedIds.includes(el.id))),
    );
    setSelectedIds([]);
  }, [selectedIds, setElements]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as any)?.tagName?.toLowerCase?.();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (e.target as any)?.isContentEditable
      )
        return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // ✅ Hotkeys 1..7 (sem Ctrl) — só no modo edição
      if (!isCtrl && isEditMode && toolByHotkey[e.key]) {
        e.preventDefault();
        setTool(toolByHotkey[e.key]);
        return;
      }

      // Undo/Redo
      if (isCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        elementsState.undo();
        return;
      }
      if (isCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        elementsState.redo();
        return;
      }

      // ✅ Desenho de linha: Enter/Esc finaliza/cancela
      if (lineDraft.active) {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelLineDraft();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          finishLineDraft();
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          removeLastLinePoint();
          return;
        }
        if (e.key === "Delete") {
          e.preventDefault();
          return;
        }
      }

      // Delete/Backspace apaga seleção (somente em modo edição)
      if ((e.key === "Delete" || e.key === "Backspace") && isEditMode) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        deleteSelectionAndRenumber();
        return;
      }

      // Copy
      if (isCtrl && e.key.toLowerCase() === "c") {
        if (!selected || selectedIds.length !== 1) return;
        e.preventDefault();
        copyRef.current = deepClone(selected);
        return;
      }

      // Paste
      if (isCtrl && e.key.toLowerCase() === "v") {
        if (!copyRef.current) return;
        e.preventDefault();

        const src = deepClone(copyRef.current);
        const id = newClientId(src.type.toLowerCase());
        const next: any = { ...src, id };

        const dx = 28;
        const dy = 28;

        if (src.type === "LINE") {
          next.points = offsetLinePoints((src as any).points ?? [], dx, dy);
          setElements((prev) => [...prev, next]);
          setSelectedIds([next.id]);
          return;
        }

        if (src.type === "TEXT" || src.type === "TREE") {
          next.x = snapInt((src as any).x + dx);
          next.y = snapInt((src as any).y + dy);
          setElements((prev) => [...prev, next]);
          setSelectedIds([next.id]);
          return;
        }

        if (src.type === "RECT") {
          if ((src as any).rectKind === "BOOTH") {
            const boothSize = boothConfigRef.current.boothSize;
            const gap = boothConfigRef.current.gap;

            const existingBooths = elements
              .filter(
                (e) => e.type === "RECT" && (e as any).rectKind === "BOOTH",
              )
              .map((e: any) => ({
                x: e.x,
                y: e.y,
                w: e.width,
                h: e.height,
              }));

            const pos = findNextGridSpotForBooth({
              baseX: (src as any).x,
              baseY: (src as any).y,
              booths: existingBooths,
              boothSize,
              gap,
            });

            next.x = pos.x;
            next.y = pos.y;
            next.width = boothSize;
            next.height = boothSize;
            next.rotation = 0;

            // ✅ BOOTH colada ganha número novo no final
            next.number = getNextBoothNumberFrom(elements);

            setElements((prev) => [...prev, next]);
            setSelectedIds([next.id]);
            return;
          }

          next.x = snapInt((src as any).x + dx);
          next.y = snapInt((src as any).y + dy);
          setElements((prev) => [...prev, next]);
          setSelectedIds([next.id]);
          return;
        }
      }

      // Generate booths dialog (Ctrl+Shift+B)
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "b") {
        if (!isEditMode) return;
        if (
          !selected ||
          selected.type !== "RECT" ||
          (selected as any).rectKind === "BOOTH"
        ) {
          toast.error({
            title: "Ação indisponível",
            subtitle:
              "Selecione um Retângulo/Quadrado (área) para gerar as barracas.",
          });
          return;
        }
        e.preventDefault();
        setGenOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    cancelLineDraft,
    deleteSelectionAndRenumber,
    elements,
    elementsState,
    finishLineDraft,
    isEditMode,
    lineDraft.active,
    removeLastLinePoint,
    selected,
    selectedIds,
    setElements,
  ]);

  /**
   * ✅ Clique operacional em BOOTH_SLOT:
   */
  const handleOperationalBoothClick = React.useCallback(
    (slotClientKey: string) => {
      if (isEditMode) return;
      setActiveSlotClientKey(slotClientKey);
      setLinkDialogOpen(true);
    },
    [isEditMode],
  );

  const templateId = (fairMap.data as any)?.template?.id as string | undefined;
  const updateTemplate = useUpdateMapTemplateMutation(templateId ?? "");

  /**
   * ✅ Salvamento do template (REPLACE de elements).
   *
   * Importante:
   * - O backend incrementa version quando enviamos `elements`.
   * - Depois do save, invalidamos:
   *   - map-templates/:id (para refletir version/elements)
   *   - fairs/:fairId/map (para o editor reabrir consolidado, e também manter links coerentes)
   *
   * Observação sobre o erro que você viu:
   * - Se o client tentar “parsear” um response vazio/undefined, pode estourar Zod.
   * - Aqui garantimos: só chamamos mutate quando templateId existe e sempre enviamos payload completo.
   */
  const handleSaveTemplate = React.useCallback(async () => {
    if (!templateId) {
      toast.error({
        title: "Não foi possível salvar",
        subtitle: "Template não carregado (templateId ausente).",
      });
      return;
    }

    const tpl = (fairMap.data as any)?.template;
    if (!tpl) {
      toast.error({
        title: "Não foi possível salvar",
        subtitle: "Template não carregado.",
      });
      return;
    }

    try {
      // ✅ Garantia de numeração coerente antes de salvar
      const normalized = renumberBooths(elements);

      const payload = {
        title: tpl.title,
        description: tpl.description ?? null,
        backgroundUrl: tpl.backgroundUrl ?? null,
        worldWidth: tpl.worldWidth ?? 2000,
        worldHeight: tpl.worldHeight ?? 1200,
        elements: normalized.map((el) => canvasElementToTemplateElement(el)),
      };


      await updateTemplate.mutateAsync(payload as any);

      // ✅ Reflete version/elements atualizados
      await qc.invalidateQueries({ queryKey: mapTemplatesKeys.byId(templateId) });
      await qc.invalidateQueries({
        queryKey: fairMapsQueryKeys.byFairId(fairId),
      });

      toast.success({
        title: "Mapa salvo",
        subtitle: "Template atualizado com sucesso.",
      });
    } catch (err) {
      toast.error({
        title: "Erro ao salvar",
        subtitle: getErrorMessage(err),
      });
    }
  }, [elements, fairId, fairMap.data, qc, templateId, updateTemplate]);

  if (fairMap.isLoading) {
    return (
      <div className="p-4">
        <div className="rounded-xl border bg-background p-6">
          <div className="text-sm font-medium">Carregando mapa…</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Buscando template e vínculos desta feira.
          </p>
        </div>
      </div>
    );
  }

  if (isNotConfigured) {
    return (
      <div className="p-4">
        <div className="rounded-xl border bg-background p-6">
          <div className="text-lg font-semibold">Mapa ainda não configurado</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta feira ainda não tem uma planta aplicada. Volte para a tela de
            plantas e aplique um template.
          </p>
        </div>
      </div>
    );
  }

  if (fairMap.error) {
    return (
      <div className="p-4">
        <div className="rounded-xl border bg-background p-6">
          <div className="text-sm font-medium">Erro ao carregar mapa</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(fairMap.error)}
          </p>
        </div>
      </div>
    );
  }

  // animação laterais
  const gridCols = isEditMode
    ? "lg:grid-cols-[280px_1fr_360px]"
    : "lg:grid-cols-[0px_1fr_0px]";
  const leftPanelClass = isEditMode
    ? "translate-x-0 opacity-100"
    : "-translate-x-8 opacity-0 pointer-events-none";
  const rightPanelClass = isEditMode
    ? "translate-x-0 opacity-100"
    : "translate-x-8 opacity-0 pointer-events-none";

  const mapName =
    typeof (fairMap.data as any)?.template?.title === "string"
      ? (fairMap.data as any).template.title
      : "Mapa";

  const isSaving = updateTemplate.isPending;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-3 p-4">
      <MapHeader
        mapName={mapName}
        isEditMode={isEditMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onSave={() => {
          if (!isEditMode) {
            toast.error({
              title: "Salvar indisponível",
              subtitle:
                "Ative o modo edição para salvar alterações do template.",
            });
            return;
          }
          if (isSaving) return;
          void handleSaveTemplate();
        }}
      />

      <MapSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        // planta
        hasBlueprint={hasBlueprint}
        isBlueprintVisible={isBlueprintVisible}
        onToggleBlueprint={() => setIsBlueprintVisible((v) => !v)}
        onPickBlueprintFile={(file) => handlePickBlueprintFile(file)}
        // edição
        isEditMode={isEditMode}
        onToggleEditMode={() => {
          setIsEditMode((v) => !v);
          setTool("SELECT");
          setSelectedIds([]);
          cancelLineDraft();
        }}
        // config booth
        boothSize={boothConfig.boothSize}
        boothGap={boothConfig.gap}
        onChangeBoothConfig={(next) => setBoothConfig(next)}
      />

      <GenerateBoothsDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        defaultQty={6}
        defaultBoothSize={boothConfig.boothSize}
        defaultGap={boothConfig.gap}
        defaultMode="HORIZONTAL"
        onConfirm={({ qty, boothSize, gap, mode }) => {
          if (
            !selected ||
            selected.type !== "RECT" ||
            (selected as any).rectKind === "BOOTH"
          )
            return;

          const qtyN = Math.max(1, Math.floor(Number(qty) || 1));
          const sizeN = Math.max(
            10,
            Math.round(Number(boothSize) || boothConfig.boothSize),
          );
          const gapN = Math.max(0, Math.round(Number(gap) || boothConfig.gap));

          setBoothConfig({ boothSize: sizeN, gap: gapN });

          // ✅ sequência a partir do estado atual
          let rolling = getNextBoothNumberFrom(elements);

          const { booths, expandedArea } = buildBoothsInAreaRotated({
            areaX: selected.x,
            areaY: selected.y,
            areaW: (selected as any).width,
            areaH: (selected as any).height,
            areaRotation: selected.rotation ?? 0,
            qty: qtyN,
            boothSize: sizeN,
            gap: gapN,
            mode,
            getNextNumber: () => rolling++,
            makeId: () => newClientId("booth"),
          });

          setElements((prev) =>
            prev.flatMap((e) => {
              if (e.id !== selected.id) return [e];
              const updatedArea = {
                ...e,
                width: expandedArea.w,
                height: expandedArea.h,
              } as any;
              return [updatedArea, ...booths];
            }),
          );

          setSelectedIds(booths.map((b) => b.id));
        }}
      />

      {/* ✅ Modal operacional de vínculo (Edit OFF) */}
      <BoothSlotLinkDialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open);
          if (!open) setActiveSlotClientKey(null);
        }}
        fairId={fairId}
        slotClientKey={activeSlotClientKey}
        linked={activeLink}
      />

      <div
        className={`grid flex-1 grid-cols-1 gap-3 ${gridCols} transition-[grid-template-columns] duration-300`}
      >
        <div className={`space-y-3 transition-all duration-300 ${leftPanelClass}`}>
          <MapToolsPanel tool={tool} onChangeTool={setTool} isEditMode={isEditMode} />
          <LegendPanel />
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-background">
          {!canTransform && selectedIds.length > 1 ? (
            <div className="absolute left-3 top-3 z-10 rounded-lg border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
              Seleção mista: para mover/rotacionar/redimensionar, selecione apenas
              itens do mesmo tipo.
            </div>
          ) : null}

          <FairMap2DCanvas
            backgroundUrl={backgroundUrl}
            elements={elements}
            setElements={setElements}
            isEditMode={isEditMode && canTransform}
            tool={tool}
            selectedIds={selectedIds}
            onSelectIds={setSelectedIds}
            onCreateAtPoint={onCreateAtPoint}
            viewportToken={viewportToken}
            // ✅ LINE draw flow
            lineDraft={lineDraft}
            onLineDraftChange={setLineDraft}
            onFinishLineDraft={finishLineDraft}
            // ✅ pintar slots linkados
            linkedBoothIds={linkedBoothIds}
            // ✅ clique operacional somente quando Edit OFF
            enableOperationalBoothClick={!isEditMode}
            onBoothClick={handleOperationalBoothClick}
          />
        </div>

        <div className={`transition-all duration-300 ${rightPanelClass}`}>
          <MapInspectorPanel
            selected={selected}
            isEditMode={isEditMode}
            onChange={(next) => {
              const nextEl = next as any;
              setElements((prev) => prev.map((e) => (e.id === nextEl.id ? nextEl : e)));
            }}
            onDelete={() => {
              if (selectedIds.length === 0) return;
              deleteSelectionAndRenumber();
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Adapter: backend element -> canvas element
 * id no canvas = clientKey do backend
 */
function adaptTemplateElementToCanvasElement(el: MapTemplateElement): MapElement {
  const style = normalizeStyle((el as any).style);
  const clientKey = (el as any).clientKey ?? (el as any).id;

  if ((el as any).type === "LINE") {
    return {
      id: clientKey,
      type: "LINE",
      x: 0,
      y: 0,
      rotation: (el as any).rotation ?? 0,
      style,
      points: ((el as any).points ?? []) as number[],
    } as any;
  }

  if ((el as any).type === "TEXT") {
    const text = (el as any).text ?? (el as any).label ?? "Texto";
    const fontSize = (el as any).fontSize ?? (el as any)?.style?.fontSize ?? 18;

    return {
      id: clientKey,
      type: "TEXT",
      x: (el as any).x ?? 0,
      y: (el as any).y ?? 0,
      rotation: (el as any).rotation ?? 0,
      style,
      text,
      fontSize,
      boxed: (el as any).boxed ?? (el as any)?.style?.boxed ?? true,
      padding: (el as any).padding ?? (el as any)?.style?.padding ?? 10,
      borderRadius:
        (el as any).borderRadius ?? (el as any)?.style?.borderRadius ?? 10,
    } as any;
  }

  if ((el as any).type === "TREE") {
    return {
      id: clientKey,
      type: "TREE",
      x: (el as any).x ?? 0,
      y: (el as any).y ?? 0,
      rotation: (el as any).rotation ?? 0,
      style,
      radius: ((el as any).radius ?? 14) as number,
      label: (el as any).label ?? undefined,
    } as any;
  }

  const backendType = (el as any).type as string;
  const rectKind =
    backendType === "BOOTH_SLOT"
      ? "BOOTH"
      : backendType === "SQUARE"
        ? "SQUARE"
        : "RECT";

  return {
    id: clientKey,
    type: "RECT",
    rectKind,
    x: (el as any).x ?? 0,
    y: (el as any).y ?? 0,
    rotation: (el as any).rotation ?? 0,
    style,
    width: ((el as any).width ?? 60) as number,
    height: ((el as any).height ?? 60) as number,
    isLinkable: rectKind === "BOOTH",
    number: rectKind === "BOOTH" ? ((el as any).number ?? undefined) : undefined,
    label: rectKind !== "BOOTH" ? ((el as any).label ?? "") : undefined,
  } as any;
}

function normalizeStyle(style: unknown) {
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

function getErrorMessage(err: unknown) {
  if (!err) return "Erro inesperado.";
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    // tenta capturar formatos comuns (ApiError/Nest error)
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