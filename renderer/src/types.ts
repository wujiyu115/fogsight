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

export interface VisualConfig {
  type: 'array' | 'tree' | 'flowchart' | 'graph' | 'custom';
  data?: number[] | string[];
  highlight?: number[];
  animation?: 'swap' | 'insert' | 'highlight' | 'fade' | 'grow';
  labels?: string[];
}

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

export type Scene =
  | TitleScene
  | ContentScene
  | StepsScene
  | CodeScene
  | CompareScene
  | SummaryScene;

export interface SceneData {
  meta: MetaConfig;
  theme: ThemeConfig;
  scenes: Scene[];
}

export interface RenderTask {
  id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  outputPath?: string;
  error?: string;
}
