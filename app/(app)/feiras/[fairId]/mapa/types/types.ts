/**
 * Tipos do Editor de Mapa 2D.
 *
 * Esta tipagem representa o contrato atual consumido pelo front.
 * O backend retorna elementos distintos por `type`, inclusive para
 * elementos retangulares especiais como `SQUARE` e `BOOTH_SLOT`.
 *
 * Decisão:
 * - RECT: retângulo genérico com width/height livres
 * - SQUARE: quadrado genérico
 * - BOOTH_SLOT: quadrado linkável/numerável usado para barracas
 * - CIRCLE: elemento circular com radius
 * - TREE: elemento visual circular com emoji/ícone de árvore
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

export type MapElementType =
  | "RECT"
  | "SQUARE"
  | "BOOTH_SLOT"
  | "LINE"
  | "TEXT"
  | "TREE"
  | "CIRCLE";

export type MapStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
};

export type MapElementBase = {
  id: string;
  type: MapElementType;

  x: number;
  y: number;
  rotation: number;

  style: MapStyle;

  /**
   * Alguns elementos persistidos também carregam metadados auxiliares
   * usados no editor e na integração com o backend.
   */
  clientKey?: string;
};

export type RectElement = MapElementBase & {
  type: "RECT";

  width: number;
  height: number;

  /**
   * Label livre para áreas como palco, staff, banheiros etc.
   */
  label?: string;

  /**
   * Campo opcional legado. Mantido temporariamente para compatibilidade
   * com trechos antigos do editor/inspector.
   */
  rectKind?: "RECT";
};

export type SquareElement = MapElementBase & {
  type: "SQUARE";

  width: number;
  height: number;

  /**
   * Label para tendas, áreas quadradas e blocos visuais.
   */
  label?: string;

  /**
   * Campo opcional legado. Mantido temporariamente para compatibilidade.
   */
  rectKind?: "SQUARE";
};

export type BoothSlotElement = MapElementBase & {
  type: "BOOTH_SLOT";

  width: number;
  height: number;

  /**
   * Barracas podem ser numeradas e vinculadas operacionalmente.
   */
  isLinkable?: boolean;
  number?: number;
  label?: string;

  /**
   * Campo opcional legado. Mantido temporariamente para compatibilidade.
   */
  rectKind?: "BOOTH";
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
   * Texto opcional com “caixa” (borda), útil para labels visuais.
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

export type CircleElement = MapElementBase & {
  type: "CIRCLE";
  radius: number;
};

export type MapElement =
  | RectElement
  | SquareElement
  | BoothSlotElement
  | LineElement
  | TextElement
  | TreeElement
  | CircleElement;