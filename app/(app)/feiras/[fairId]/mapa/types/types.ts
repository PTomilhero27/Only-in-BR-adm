/**
 * Tipos do Editor de Mapa 2D.
 * Ajuste: diferenciar retângulos por "rectKind" (BOOTH/RECT/SQUARE),
 * pois regras e UI do inspector mudam conforme o tipo.
 *
 * Decisão:
 * - "BOOTH" continua sendo um RECT com rectKind="BOOTH" (facilita link e numeração).
 * - "CIRCLE" vira um tipo próprio (CircleElement), pois a propriedade principal é "radius".
 */

export type MapTool =
  | "SELECT"
  | "BOOTH"
  | "RECT"
  | "SQUARE"
  | "LINE"
  | "TEXT"
  | "TREE"
  | "CIRCLE";

export type MapElementType = "RECT" | "LINE" | "TEXT" | "TREE" | "CIRCLE";

export type MapStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
};

export type RectKind = "BOOTH" | "RECT" | "SQUARE";

export type MapElementBase = {
  id: string;
  type: MapElementType;

  x: number;
  y: number;
  rotation: number;

  style: MapStyle;
};

export type RectElement = MapElementBase & {
  type: "RECT";
  rectKind: RectKind;

  width: number;
  height: number;

  /**
   * Somente BOOTH tem número/vínculo.
   */
  isLinkable?: boolean;
  number?: number;

  /**
   * Somente RECT/SQUARE usam label (ex.: Palco, Camarim).
   */
  label?: string;
};

export type LineElement = MapElementBase & {
  type: "LINE";
  points: number[]; // [x1,y1,x2,y2,...]
};

export type TextElement = MapElementBase & {
  type: "TEXT";
  text: string;
  fontSize: number;

  /**
   * Texto opcional com “caixa” (borda), para virar um label visual.
   */
  boxed?: boolean;
  padding?: number;
  borderRadius?: number;
};

export type TreeElement = MapElementBase & {
  type: "TREE";
  radius: number;
  label?: string;
};

/**
 * ✅ NOVO: elemento circular genérico
 * - Útil para “rotatórias”, “ilhas”, “canteiros”, “pontos” etc.
 * - Mantemos apenas radius (não elipse) para simplicidade e consistência no transformer.
 */
export type CircleElement = MapElementBase & {
  type: "CIRCLE";
  radius: number;
};

export type MapElement =
  | RectElement
  | LineElement
  | TextElement
  | TreeElement
  | CircleElement;