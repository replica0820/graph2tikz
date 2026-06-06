export interface Vertex {
  id: string;
  x: number;
  y: number;
  label?: string;
  color?: string;
  part?: number; // 部集合
}

export interface Edge {
  id: string;
  sourceId: string; // 始点
  targetId: string; // 終点
  isDirected: boolean;
  curveStrength? : number;
}