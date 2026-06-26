export interface ThemeConfig {
  background: string;
  primary: string;
  accent: string;
  textColor: string;
  fontFamily: string;
}

export interface MetaConfig {
  title: string;
  fps: number;
  width: number;
  height: number;
}

// --- Visual configs (discriminated union) ---

export interface ArrayVisualConfig {
  type: 'array';
  data: number[] | string[];
  highlight?: number[];
  colors?: string[];
  animation?: 'swap' | 'insert' | 'highlight' | 'fade' | 'grow';
  labels?: string[];
}

export interface PieChartConfig {
  type: 'pie';
  segments: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  donut?: boolean;
}

export interface LineChartConfig {
  type: 'line';
  points: number[];
  labels?: string[];
  lineColor?: string;
  fillArea?: boolean;
}

export interface FlowChartConfig {
  type: 'flowchart';
  nodes: Array<{
    id: string;
    label: string;
    style?: 'rectangle' | 'diamond' | 'rounded' | 'circle';
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
  direction?: 'horizontal' | 'vertical';
}

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

export interface TreeVisualConfig {
  type: 'tree';
  root: TreeNode;
  highlight?: string[];
}

export type VisualConfig =
  | ArrayVisualConfig
  | PieChartConfig
  | LineChartConfig
  | FlowChartConfig
  | TreeVisualConfig;

// --- Scene types ---

export interface TitleScene {
  type: 'title';
  duration: number;
  title: string;
  subtitle?: string;
  description?: string;
}

export interface ContentScene {
  type: 'content';
  duration: number;
  title: string;
  body: string;
  visual?: VisualConfig;
}

export interface StepsScene {
  type: 'steps';
  duration: number;
  title: string;
  steps: Array<{
    data: number[] | string[];
    highlight?: number[];
    colors?: string[];
    labels?: string[];
    action: 'swap' | 'insert' | 'compare' | 'keep' | 'remove';
    label?: string;
  }>;
}

export interface CodeScene {
  type: 'code';
  duration: number;
  title: string;
  language: string;
  code: string;
  highlights?: number[];
}

export interface CompareScene {
  type: 'compare';
  duration: number;
  title: string;
  left: { label: string; items: string[] };
  right: { label: string; items: string[] };
}

export interface SummaryScene {
  type: 'summary';
  duration: number;
  title?: string;
  points: string[];
}

export interface TimelineScene {
  type: 'timeline';
  duration: number;
  title: string;
  events: Array<{
    time: string;
    title: string;
    description?: string;
  }>;
}

export interface FormulaScene {
  type: 'formula';
  duration: number;
  title: string;
  formula: string;
  description?: string;
}

export interface QuoteScene {
  type: 'quote';
  duration: number;
  quote: string;
  attribution?: string;
  highlight?: boolean;
}

export interface DiagramScene {
  type: 'diagram';
  duration: number;
  title: string;
  description?: string;
  flowchart: FlowChartConfig;
}

export type Scene =
  | TitleScene
  | ContentScene
  | StepsScene
  | CodeScene
  | CompareScene
  | SummaryScene
  | TimelineScene
  | FormulaScene
  | QuoteScene
  | DiagramScene;

// --- Transition config ---

export type TransitionType = 'fade' | 'slide' | 'wipe' | 'none';

export interface TransitionConfig {
  type: TransitionType;
  duration?: number;
  direction?: 'from-left' | 'from-right' | 'from-top' | 'from-bottom';
}

// --- Top-level data ---

export interface SceneData {
  meta: MetaConfig;
  theme: ThemeConfig;
  scenes: Scene[];
  transition?: TransitionConfig;
}

export interface RenderTask {
  id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  outputPath?: string;
  error?: string;
}
