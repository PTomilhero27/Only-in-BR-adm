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
import { MarketplaceSlotPanel } from "./marketplace-slot-panel";

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
import { useGlobalFair } from "../../../components/global-fair-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ───────────────────────── Extracted modules ─────────────────────────
import { useUndoRedo } from "./use-undo-redo";
import {
  deepClone,
  offsetLinePoints,
  newClientId,
  snapInt,
  findNextGridSpotForBooth,
  buildBoothsInAreaRotated,
  renumberBooths,
  getNextBoothNumberFrom,
  selectionIsHomogeneous,
  toolByHotkey,
  getErrorMessage,
} from "./map-utils";
import {
  canvasElementToTemplateElement,
  adaptTemplateElementToCanvasElement,
} from "./map-serialization";

// ───────────────────────── Component ─────────────────────────

export function MapaClient({ fairId }: { fairId: string }) {
  const qc = useQueryClient();
  const fairMap = useFairMapQuery(fairId);
  const { isFinalizada } = useGlobalFair();

  const [tool, setTool] = React.useState<MapTool>("SELECT");
  const [isEditMode, setIsEditMode] = React.useState(true);

  const [boothConfig, setBoothConfig] = React.useState({
    boothSize: 70,
    gap: 8,
  });
  const boothConfigRef = React.useRef(boothConfig);
  React.useEffect(() => void (boothConfigRef.current = boothConfig), [boothConfig]);

  const [localBlueprintUrl, setLocalBlueprintUrl] = React.useState<string | null>(null);
  const [isBlueprintVisible, setIsBlueprintVisible] = React.useState(true);
  const [viewportToken, setViewportToken] = React.useState(0);

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [genOpen, setGenOpen] = React.useState(false);

  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [activeSlotClientKey, setActiveSlotClientKey] = React.useState<string | null>(
    null,
  );

  // Marketplace panel
  const [marketplacePanelOpen, setMarketplacePanelOpen] = React.useState(false);
  const [activeMarketplaceSlotId, setActiveMarketplaceSlotId] = React.useState<string | null>(null);

  const isNotConfigured =
    (fairMap.error as any)?.statusCode === 404 ||
    (fairMap.error as any)?.status === 404;

  const templateBackgroundUrl = fairMap.data?.template?.backgroundUrl ?? null;
  const hasBlueprint = !!(localBlueprintUrl ?? templateBackgroundUrl);

  const backgroundUrl = isBlueprintVisible
    ? (localBlueprintUrl ?? templateBackgroundUrl ?? undefined)
    : undefined;

  const linkedBoothIds = React.useMemo(() => {
    const ids = (fairMap.data?.links ?? []).map((l: any) =>
      String(l?.slotClientKey ?? ""),
    );
    return new Set(ids.filter(Boolean));
  }, [fairMap.data?.links]);

  const linkBySlotClientKey = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const l of fairMap.data?.links ?? []) {
      const k = String((l as any)?.slotClientKey ?? "");
      if (k) map.set(k, l);
    }
    return map;
  }, [fairMap.data?.links]);

  const activeLink = React.useMemo(() => {
    if (!activeSlotClientKey) return null;
    return linkBySlotClientKey.get(activeSlotClientKey) ?? null;
  }, [activeSlotClientKey, linkBySlotClientKey]);

  // ───────────────────────── Marketplace slot status map ─────────────────────────

  const slotStatusMap = React.useMemo(() => {
    const slots = (fairMap.data as any)?.slots ?? [];
    const map = new Map<string, { commercialStatus: string; priceCents: number }>();
    for (const s of slots) {
      if (s?.fairMapElementId) {
        map.set(String(s.fairMapElementId), {
          commercialStatus: s.commercialStatus ?? "AVAILABLE",
          priceCents: s.priceCents ?? 0,
        });
      }
    }
    return map;
  }, [fairMap.data]);

  const marketplaceCounts = React.useMemo(() => {
    const slots = (fairMap.data as any)?.slots ?? [];
    return {
      AVAILABLE: slots.filter((s: any) => s.commercialStatus === "AVAILABLE").length,
      RESERVED: slots.filter((s: any) => s.commercialStatus === "RESERVED").length,
      CONFIRMED: slots.filter((s: any) => s.commercialStatus === "CONFIRMED").length,
      BLOCKED: slots.filter((s: any) => s.commercialStatus === "BLOCKED").length,
    };
  }, [fairMap.data]);

  const activeMarketplaceSlot = React.useMemo(() => {
    if (!activeMarketplaceSlotId) return null;
    const slots = (fairMap.data as any)?.slots ?? [];
    return slots.find((s: any) => s.id === activeMarketplaceSlotId) ?? null;
  }, [activeMarketplaceSlotId, fairMap.data]);

  const pendingReservationsCount = marketplaceCounts.RESERVED;

  const templateElements = fairMap.data?.template?.elements ?? [];

  const initialElements = React.useMemo<MapElement[]>(() => {
    const raw = templateElements as MapTemplateElement[];
    return raw.map((el) => adaptTemplateElementToCanvasElement(el));
  }, [templateElements]);

  const elementsState = useUndoRedo<MapElement[]>([]);
  const elements = elementsState.state.present;

  const setElements = React.useCallback<
    React.Dispatch<React.SetStateAction<MapElement[]>>
  >((action) => elementsState.set(action), [elementsState]);

  const serverTemplateIdentity = React.useMemo(() => {
    const tpl = fairMap.data?.template;
    if (!tpl) return "no-template";
    return `${tpl.id}:${tpl.version}`;
  }, [fairMap.data?.template]);

  const lastAppliedServerIdentityRef = React.useRef<string>("");

  React.useEffect(() => {
    if (!initialElements) return;

    if (lastAppliedServerIdentityRef.current === serverTemplateIdentity) {
      return;
    }

    elementsState.reset(initialElements);
    setSelectedIds([]);
    lastAppliedServerIdentityRef.current = serverTemplateIdentity;
  }, [elementsState, initialElements, serverTemplateIdentity]);

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const selected = React.useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return elements.find((e) => e.id === selectedIds[0]) ?? null;
  }, [elements, selectedIds]);

  const canTransform = React.useMemo(
    () => selectionIsHomogeneous(elements, selectedIds),
    [elements, selectedIds],
  );

  React.useEffect(() => {
    return () => {
      if (localBlueprintUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localBlueprintUrl);
      }
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

    if (localBlueprintUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(localBlueprintUrl);
    }

    const url = URL.createObjectURL(file);
    setLocalBlueprintUrl(url);
    setIsBlueprintVisible(true);
    setViewportToken((v) => v + 1);
  }

  const updateElementById = React.useCallback(
    (elementId: string, next: MapElement) => {
      setElements((prev) => prev.map((e) => (e.id === elementId ? next : e)));
    },
    [setElements],
  );

  // ───────────────────────── Create at point ─────────────────────────

  const onCreateAtPoint = React.useCallback(
    (pt: { x: number; y: number }) => {
      if (!isEditMode || isFinalizada) return;

      if (tool === "BOOTH") {
        const boothSize = boothConfigRef.current.boothSize;

        setElements((prev) => {
          const nextNumber = getNextBoothNumberFrom(prev);

          const booth: MapElement = {
            id: newClientId("booth"),
            type: "BOOTH_SLOT",
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

      if (tool === "RECT") {
        const rect: MapElement = {
          id: newClientId("rect"),
          type: "RECT",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          width: 140,
          height: 90,
          style: { fill: "#E2E8F0", stroke: "#0F172A", strokeWidth: 2, opacity: 0.75 },
          label: "Área",
        } as any;

        setElements((prev) => [...prev, rect]);
        setSelectedIds([rect.id]);
        return;
      }

      if (tool === "SQUARE") {
        const square: MapElement = {
          id: newClientId("square"),
          type: "SQUARE",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          width: 90,
          height: 90,
          style: { fill: "#E2E8F0", stroke: "#0F172A", strokeWidth: 2, opacity: 0.75 },
          label: "Área",
        } as any;

        setElements((prev) => [...prev, square]);
        setSelectedIds([square.id]);
        return;
      }

      if (tool === "CIRCLE") {
        const circle: MapElement = {
          id: newClientId("circle"),
          type: "CIRCLE",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          radius: 45,
          style: { fill: "#E2E8F0", stroke: "#0F172A", strokeWidth: 2, opacity: 0.75 },
        } as any;

        setElements((prev) => [...prev, circle]);
        setSelectedIds([circle.id]);
        return;
      }

      if (tool === "TEXT") {
        const text: MapElement = {
          id: newClientId("text"),
          type: "TEXT",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          style: { fill: "#0F172A", stroke: "#0F172A", strokeWidth: 2, opacity: 1 },
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
          style: { fill: "#BBF7D0", stroke: "#16A34A", strokeWidth: 2, opacity: 1 },
          radius: 18,
        } as any;

        setElements((prev) => [...prev, tree]);
        setSelectedIds([tree.id]);
      }
    },
    [isEditMode, setElements, tool],
  );

  // ───────────────────────── Copy / Paste / Line / Keyboard ─────────────────────────

  const copyRef = React.useRef<MapElement | null>(null);

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
          style: { fill: "#000000", stroke: "#0F172A", strokeWidth: 3, opacity: 0.9 },
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

  // ───────────────────────── Keyboard Handler ─────────────────────────

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as any)?.tagName?.toLowerCase?.();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (e.target as any)?.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isFinalizada) return;

      if (!isCtrl && isEditMode && toolByHotkey[e.key]) {
        e.preventDefault();
        setTool(toolByHotkey[e.key]);
        return;
      }

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

      if (lineDraft.active) {
        if (e.key === "Escape") { e.preventDefault(); cancelLineDraft(); return; }
        if (e.key === "Enter") { e.preventDefault(); finishLineDraft(); return; }
        if (e.key === "Backspace") { e.preventDefault(); removeLastLinePoint(); return; }
        if (e.key === "Delete") { e.preventDefault(); return; }
      }

      if ((e.key === "Delete" || e.key === "Backspace") && isEditMode) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        deleteSelectionAndRenumber();
        return;
      }

      if (isCtrl && e.key.toLowerCase() === "c") {
        if (!selected || selectedIds.length !== 1) return;
        e.preventDefault();
        copyRef.current = deepClone(selected);
        return;
      }

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

        if (src.type === "TEXT" || src.type === "TREE" || src.type === "CIRCLE") {
          next.x = snapInt((src as any).x + dx);
          next.y = snapInt((src as any).y + dy);
          setElements((prev) => [...prev, next]);
          setSelectedIds([next.id]);
          return;
        }

        if (src.type === "BOOTH_SLOT") {
          const boothSize = boothConfigRef.current.boothSize;
          const gap = boothConfigRef.current.gap;

          const existingBooths = elements
            .filter((e) => e.type === "BOOTH_SLOT")
            .map((e: any) => ({ x: e.x, y: e.y, w: e.width, h: e.height }));

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
          next.number = getNextBoothNumberFrom(elements);

          setElements((prev) => [...prev, next]);
          setSelectedIds([next.id]);
          return;
        }

        if (src.type === "RECT" || src.type === "SQUARE") {
          next.x = snapInt((src as any).x + dx);
          next.y = snapInt((src as any).y + dy);
          setElements((prev) => [...prev, next]);
          setSelectedIds([next.id]);
          return;
        }
      }

      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "b") {
        if (!isEditMode) return;

        if (!selected || !(selected.type === "RECT" || selected.type === "SQUARE")) {
          toast.error({
            title: "Ação indisponível",
            subtitle: "Selecione um Retângulo/Quadrado (área) para gerar as barracas.",
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

  // ───────────────────────── Operational booth click ─────────────────────────

  const handleOperationalBoothClick = React.useCallback(
    (slotIdOrClientKey: string) => {
      if (isEditMode) return;

      const el = elements.find((e) => e.id === slotIdOrClientKey);
      const resolved = (el as any)?.clientKey ?? slotIdOrClientKey;

      // Tenta encontrar um FairMapSlot com este fairMapElementId
      const slots = (fairMap.data as any)?.slots ?? [];
      const matchingSlot = slots.find(
        (s: any) => s.fairMapElementId === resolved || s.fairMapElementId === slotIdOrClientKey,
      );

      if (matchingSlot) {
        // Abre painel marketplace
        setActiveMarketplaceSlotId(matchingSlot.id);
        setMarketplacePanelOpen(true);
      } else {
        // Fallback: abre link dialog antigo
        setActiveSlotClientKey(String(resolved));
        setLinkDialogOpen(true);
      }
    },
    [isEditMode, elements, fairMap.data],
  );

  // ───────────────────────── Save ─────────────────────────

  const templateId = (fairMap.data as any)?.template?.id as string | undefined;
  const updateTemplate = useUpdateMapTemplateMutation(templateId ?? "");

  const handleSaveTemplate = React.useCallback(async () => {
    if (!templateId) {
      toast.error({ title: "Não foi possível salvar", subtitle: "Template não carregado (templateId ausente)." });
      return;
    }

    const tpl = (fairMap.data as any)?.template;
    if (!tpl) {
      toast.error({ title: "Não foi possível salvar", subtitle: "Template não carregado." });
      return;
    }

    try {
      const normalized = renumberBooths(elements);
      const serialized = normalized.map((el) => canvasElementToTemplateElement(el));

      const payload = {
        title: tpl.title,
        description: tpl.description ?? null,
        backgroundUrl: tpl.backgroundUrl ?? null,
        worldWidth: tpl.worldWidth ?? 2000,
        worldHeight: tpl.worldHeight ?? 1200,
        elements: serialized,
      };

      await updateTemplate.mutateAsync(payload as any);

      elementsState.reset(normalized);
      lastAppliedServerIdentityRef.current = serverTemplateIdentity;

      await qc.invalidateQueries({ queryKey: mapTemplatesKeys.byId(templateId) });
      await qc.invalidateQueries({ queryKey: fairMapsQueryKeys.byFairId(fairId) });

      toast.success({ title: "Mapa salvo", subtitle: "Template atualizado com sucesso." });
    } catch (err) {
      toast.error({ title: "Erro ao salvar", subtitle: getErrorMessage(err) });
    }
  }, [
    elements,
    elementsState,
    fairId,
    fairMap.data,
    qc,
    serverTemplateIdentity,
    templateId,
    updateTemplate,
  ]);

  // ───────────────────────── Loading / Error states ─────────────────────────

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
            Esta feira ainda não tem uma planta aplicada. Volte para a tela de plantas
            e aplique um template.
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

  // ───────────────────────── Render ─────────────────────────

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
        mapName={(fairMap.data as any)?.template?.title ?? "Mapa"}
        isEditMode={isEditMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onSave={() => {
          if (isFinalizada) {
            toast.error({
              title: "Ação bloqueada",
              subtitle: "A feira está finalizada. O mapa não pode ser salvo.",
            });
            return;
          }
          if (!isEditMode) {
            toast.error({
              title: "Salvar indisponível",
              subtitle: "Ative o modo edição para salvar alterações do template.",
            });
            return;
          }
          if (isSaving) return;
          void handleSaveTemplate();
        }}
        isSaving={isSaving}
      />

      {pendingReservationsCount > 0 && !isEditMode && (
        <Alert variant="default" className="border-blue-200 bg-blue-50/50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 font-semibold">Reservas Pendentes</AlertTitle>
          <AlertDescription className="text-blue-700 flex items-center justify-between gap-4">
            <span>
              Existem <strong>{pendingReservationsCount}</strong> reservas aguardando conclusão neste
              mapa.
            </span>
            <Badge
              variant="outline"
              className="bg-blue-100 border-blue-200 text-blue-800 animate-pulse"
            >
              Ação Requerida
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      <MapSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hasBlueprint={hasBlueprint}
        isBlueprintVisible={isBlueprintVisible}
        onToggleBlueprint={() => setIsBlueprintVisible((v) => !v)}
        onPickBlueprintFile={(file) => handlePickBlueprintFile(file)}
        isEditMode={isEditMode}
        onToggleEditMode={() => {
          if (isFinalizada) {
            toast.error({ title: "Ação bloqueada", subtitle: "A feira está finalizada, o modo edição está desabilitado." });
            return;
          }
          setIsEditMode((v) => !v);
          setTool("SELECT");
          setSelectedIds([]);
          cancelLineDraft();
        }}
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
          if (!selected || !(selected.type === "RECT" || selected.type === "SQUARE")) {
            return;
          }

          const qtyN = Math.max(1, Math.floor(Number(qty) || 1));
          const sizeN = Math.max(10, Math.round(Number(boothSize) || boothConfig.boothSize));
          const gapN = Math.max(0, Math.round(Number(gap) || boothConfig.gap));

          setBoothConfig({ boothSize: sizeN, gap: gapN });

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

      <MarketplaceSlotPanel
        open={marketplacePanelOpen}
        onOpenChange={(open) => {
          setMarketplacePanelOpen(open);
          if (!open) setActiveMarketplaceSlotId(null);
        }}
        fairId={fairId}
        slotInfo={activeMarketplaceSlot}
        boothNumber={
          activeMarketplaceSlot
            ? (elements.find(
                (e) =>
                  (e as any).clientKey === activeMarketplaceSlot.fairMapElementId ||
                  e.id === activeMarketplaceSlot.fairMapElementId,
              ) as any)?.number ?? null
            : null
        }
      />

      <div
        className={`grid flex-1 grid-cols-1 gap-3 ${gridCols} transition-[grid-template-columns] duration-300`}
      >
        <div className={`space-y-3 transition-all duration-300 ${leftPanelClass}`}>
          <MapToolsPanel tool={tool} onChangeTool={setTool} isEditMode={isEditMode} />
          <LegendPanel counts={marketplaceCounts} />
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-background touch-none">
          {!canTransform && selectedIds.length > 1 ? (
            <div className="absolute left-3 top-3 z-10 rounded-lg border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
              Seleção mista: para mover/rotacionar/redimensionar, selecione apenas itens do
              mesmo tipo.
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
            lineDraft={lineDraft}
            onLineDraftChange={setLineDraft}
            onFinishLineDraft={finishLineDraft}
            linkedBoothIds={linkedBoothIds}
            slotStatusMap={slotStatusMap}
            enableOperationalBoothClick={!isEditMode}
            onBoothClick={handleOperationalBoothClick}
          />
        </div>

        <div className={`transition-all duration-300 ${rightPanelClass}`}>
          <MapInspectorPanel
            selected={selected}
            isEditMode={isEditMode}
            onChange={(next) => {
              const nextEl = next as MapElement;
              updateElementById(nextEl.id, nextEl);
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