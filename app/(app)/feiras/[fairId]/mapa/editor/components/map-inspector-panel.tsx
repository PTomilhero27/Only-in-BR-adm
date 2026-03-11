"use client";

/**
 * MapInspectorPanel
 *
 * Esta lateral é responsável por editar os atributos do elemento atualmente
 * selecionado no editor do mapa.
 *
 * Ajustes aplicados:
 * - remove dependência de `rectKind`
 * - passa a respeitar o contrato novo com `RECT`, `SQUARE` e `BOOTH_SLOT`
 * - mantém inputs numéricos como `type="text"` para evitar inconsistências
 *   comuns do `input[type=number]`
 * - adiciona suporte explícito para `CIRCLE`
 */

import * as React from "react";
import type {
  MapElement,
  RectElement,
  SquareElement,
  BoothSlotElement,
  TextElement,
  TreeElement,
  CircleElement,
} from "../../types/types";
import { Button } from "@/components/ui/button";

type Props = {
  selected: MapElement | null;
  onChange: (next: MapElement) => void;
  onDelete: () => void;
  isEditMode: boolean;
};

export function MapInspectorPanel({
  selected,
  onChange,
  onDelete,
  isEditMode,
}: Props) {
  if (!selected) {
    return (
      <div className="rounded-xl border bg-background p-4">
        <div className="text-sm font-medium">Inspector</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione um elemento para ver detalhes.
        </p>
      </div>
    );
  }

  const title = getElementLabel(selected);
  const isBooth = selected.type === "BOOTH_SLOT";

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Inspector</div>

        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-full px-2 py-0.5 text-xs font-medium",
              isEditMode
                ? "bg-orange-500 text-white"
                : "border bg-background text-muted-foreground",
            ].join(" ")}
          >
            {isEditMode ? "EDITANDO" : "VISUALIZAÇÃO"}
          </span>

          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={!isEditMode}
            title={
              !isEditMode
                ? "Ative o modo edição para remover elementos"
                : "Remover elemento"
            }
          >
            Remover
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            {isBooth
              ? "Slot de barraca com numeração automática."
              : "Elemento do mapa."}
          </div>
        </div>

        {(selected.type === "RECT" || selected.type === "SQUARE") ? (
          <Section title="Rótulo">
            <TextField
              label="Nome do elemento"
              value={selected.label ?? ""}
              disabled={!isEditMode}
              onChange={(v) =>
                onChange({
                  ...selected,
                  label: v,
                } as RectElement | SquareElement)
              }
              placeholder="Ex.: Palco, Entrada, Banheiros..."
            />
          </Section>
        ) : null}

        {(selected.type === "RECT" ||
          selected.type === "SQUARE" ||
          selected.type === "BOOTH_SLOT") ? (
          <Section title="Dimensões">
            <NumberTextField
              label="Largura"
              value={selected.width}
              disabled={!isEditMode}
              onChange={(v) => {
                if (selected.type === "SQUARE" || selected.type === "BOOTH_SLOT") {
                  const size = clampMin(v, 10);

                  onChange({
                    ...selected,
                    width: size,
                    height: size,
                  } as SquareElement | BoothSlotElement);

                  return;
                }

                onChange({
                  ...selected,
                  width: clampMin(v, 10),
                } as RectElement);
              }}
            />

            <NumberTextField
              label="Altura"
              value={selected.height}
              disabled={!isEditMode}
              onChange={(v) => {
                if (selected.type === "SQUARE" || selected.type === "BOOTH_SLOT") {
                  const size = clampMin(v, 10);

                  onChange({
                    ...selected,
                    width: size,
                    height: size,
                  } as SquareElement | BoothSlotElement);

                  return;
                }

                onChange({
                  ...selected,
                  height: clampMin(v, 10),
                } as RectElement);
              }}
            />

            {selected.type === "BOOTH_SLOT" ? (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Número:{" "}
                <span className="font-medium text-foreground">
                  {selected.number ?? "—"}
                </span>{" "}
                (automático)
              </div>
            ) : null}
          </Section>
        ) : null}

        {selected.type === "TEXT" ? (
          <Section title="Texto">
            <TextField
              label="Conteúdo"
              value={selected.text}
              disabled={!isEditMode}
              onChange={(v) => onChange({ ...selected, text: v } as TextElement)}
              placeholder="Digite o texto..."
            />

            <NumberTextField
              label="Tamanho"
              value={selected.fontSize}
              disabled={!isEditMode}
              onChange={(v) =>
                onChange({ ...selected, fontSize: clampMin(v, 8) } as TextElement)
              }
            />

            <ToggleField
              label="Caixa (box)"
              value={!!selected.boxed}
              disabled={!isEditMode}
              onChange={(v) =>
                onChange({ ...selected, boxed: v } as TextElement)
              }
            />

            {selected.boxed ? (
              <>
                <NumberTextField
                  label="Padding"
                  value={selected.padding ?? 10}
                  disabled={!isEditMode}
                  onChange={(v) =>
                    onChange({ ...selected, padding: clampMin(v, 0) } as TextElement)
                  }
                />
                <NumberTextField
                  label="Arredondamento"
                  value={selected.borderRadius ?? 10}
                  disabled={!isEditMode}
                  onChange={(v) =>
                    onChange(
                      {
                        ...selected,
                        borderRadius: clampMin(v, 0),
                      } as TextElement,
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Texto ficará centralizado automaticamente quando a caixa estiver ligada.
                </p>
              </>
            ) : null}
          </Section>
        ) : null}

        {selected.type === "TREE" ? (
          <Section title="Árvore">
            <NumberTextField
              label="Tamanho"
              value={selected.radius}
              disabled={!isEditMode}
              onChange={(v) =>
                onChange({ ...selected, radius: clampMin(v, 6) } as TreeElement)
              }
            />
          </Section>
        ) : null}

        {selected.type === "CIRCLE" ? (
          <Section title="Círculo">
            <NumberTextField
              label="Raio"
              value={selected.radius}
              disabled={!isEditMode}
              onChange={(v) =>
                onChange({ ...selected, radius: clampMin(v, 10) } as CircleElement)
              }
            />
          </Section>
        ) : null}

        <Section title="Aparência">
          <ColorField
            label="Cor de preenchimento"
            value={selected.style.fill}
            disabled={!isEditMode}
            onChange={(v) =>
              onChange({ ...selected, style: { ...selected.style, fill: v } })
            }
          />

          <ColorField
            label="Cor da borda"
            value={selected.style.stroke}
            disabled={!isEditMode}
            onChange={(v) =>
              onChange({ ...selected, style: { ...selected.style, stroke: v } })
            }
          />

          <NumberTextField
            label="Espessura da borda"
            value={selected.style.strokeWidth}
            disabled={!isEditMode}
            onChange={(v) =>
              onChange({
                ...selected,
                style: { ...selected.style, strokeWidth: clampMin(v, 0) },
              })
            }
          />

          <RangeField
            label="Transparência"
            value={selected.style.opacity}
            disabled={!isEditMode}
            onChange={(v) =>
              onChange({
                ...selected,
                style: { ...selected.style, opacity: v },
              })
            }
          />
        </Section>
      </div>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

/**
 * Agrupa visualmente uma seção do inspector.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-3 grid gap-2">{children}</div>
    </div>
  );
}

/**
 * Input numérico implementado como text para evitar bugs comuns do
 * input type="number", especialmente em edição incremental.
 */
function NumberTextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const str = Number.isFinite(value) ? String(value) : "0";

  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={str}
        onChange={(e) => onChange(parseDigitsToNumber(e.target.value))}
        className={[
          "h-9 w-full rounded-md border bg-background px-3 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
          disabled ? "opacity-60" : "",
        ].join(" ")}
      />
    </label>
  );
}

/**
 * Campo de texto simples para labels e conteúdos.
 */
function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "h-9 w-full rounded-md border bg-background px-3 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
          disabled ? "opacity-60" : "",
        ].join(" ")}
      />
    </label>
  );
}

/**
 * Toggle booleano para propriedades como `boxed`.
 */
function ToggleField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={[
          "h-7 w-12 rounded-full border transition",
          value ? "border-orange-500 bg-orange-500" : "bg-background",
          disabled ? "opacity-60" : "hover:bg-muted",
        ].join(" ")}
      >
        <span
          className={[
            "block h-6 w-6 rounded-full bg-white shadow transition",
            value ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

/**
 * Campo de cor com preview + color picker + input textual.
 */
function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className={[
            "h-9 w-10 rounded-md border",
            disabled ? "opacity-60" : "hover:opacity-90",
          ].join(" ")}
          style={{ backgroundColor: value }}
          title={value}
          onClick={() => {
            const el = document.getElementById(`color_${label}`) as HTMLInputElement | null;
            el?.click();
          }}
        />
        <input
          id={`color_${label}`}
          type="color"
          value={normalizeHex(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded-md border bg-background px-1"
          title="Escolher cor"
        />

        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={[
            "h-9 flex-1 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
            disabled ? "opacity-60" : "",
          ].join(" ")}
        />
      </div>
    </label>
  );
}

/**
 * Slider para opacidade do elemento.
 */
function RangeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={clamp(value, 0, 1)}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value), 0, 1))}
        className={disabled ? "opacity-60" : ""}
      />
    </label>
  );
}

/* ---------------- Logic helpers ---------------- */

/**
 * Gera o nome amigável do elemento selecionado para o topo do inspector.
 */
function getElementLabel(el: MapElement) {
  if (el.type === "BOOTH_SLOT") return "Barraca (slot)";
  if (el.type === "SQUARE") return "Quadrado";
  if (el.type === "RECT") return "Retângulo";
  if (el.type === "TEXT") return "Texto";
  if (el.type === "LINE") return "Linha";
  if (el.type === "CIRCLE") return "Círculo";
  if (el.type === "TREE") return "Árvore";
  return "Elemento";
}

function parseDigitsToNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const n = Number(digits || "0");
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clampMin(n: number, min: number) {
  return Math.max(min, n);
}

function normalizeHex(value: string) {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return "#000000";
}