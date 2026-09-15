/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimelinePostMedia {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  data?: string;
  name?: string;
  url?: string;
  label?: string;
}

export interface TimelinePostComment {
  id: string;
  text: string;
  time: number;
}

export interface TimelinePost {
  id: string;
  title?: string | null;
  text: string;
  tags?: string[];
  colorId?: string;
  time: number;
  pinned?: boolean;
  comments?: TimelinePostComment[];
  media?: TimelinePostMedia[];
  parentId?: string | null;
  likes?: number;
  liked?: boolean;
  saved?: boolean;
  reposts?: number;
  repostedFrom?: string;
  linkedNodes?: string[];
}

export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'status' | 'tag' | 'link';
  width?: number;
}

export interface TableRow {
  id: string;
  cells: Record<string, any>;
}

export interface TableConfig {
  columns: TableColumn[];
  rows: TableRow[];
  activeSort?: { columnId: string; dir: 'asc' | 'desc' } | null;
  filterStatus?: string | null;
  filterTag?: string | null;
  searchQuery?: string;
}

export interface Node {
  id: string;
  type: 'note' | 'code' | 'todo' | 'image' | 'file' | 'link' | 'stopwatch' | 'clock' | 'timeline' | 'table';
  x: number;
  y: number;
  w?: number;
  h?: number;
  z?: number;
  createdAt?: number;
  title?: string;
  bg?: string;
  text?: string;
  markdown?: boolean;
  tags?: string[];
  code?: string;
  lang?: string;
  todos?: { id: number; text: string; done: boolean }[];
  img?: string;
  imgPath?: string;
  imgScale?: number;
  file?: {
    name: string;
    type: string;
    size: number;
    lastModified: number;
    path?: string;
    url?: string;
  };
  links?: { id: string; url: string; label?: string }[];
  elapsedMs?: number;
  running?: boolean;
  startedAt?: number | null;
  swMode?: 'up' | 'down';
  countdownMs?: number;
  timezone?: string;
  posts?: TimelinePost[];
  eventDate?: string;
  tableData?: TableConfig;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  style?: string;
  color?: string;
  locked?: boolean;
  label?: string;
  directed?: boolean;
}

export interface Group {
  id: string;
  name: string;
  colorId: string;
  nodeIds: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed?: boolean;
  z?: number;
  locked?: boolean;
  customColor?: string;
  parentId?: string | null;
  updatedAt?: number;
}

export interface Text {
  id: string;
  x: number;
  y: number;
  content: string;
  color?: string;
  bg?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  rotation?: number;
  pinned?: boolean;
  z?: number;
  _saved?: boolean;
  createdAt?: number;
}

export interface Drawing {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  opacity: number;
}

export interface Shape {
  id: string;
  kind: 'rect' | 'circle' | 'triangle' | 'line' | 'arrow';
  x: number;
  y: number;
  w: number;
  h: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  rotation?: number;
  color: string;
  fill?: string;
  strokeWidth: number;
  opacity: number;
}

export interface BoardState {
  nodes: Node[];
  connections: Connection[];
  groups: Group[];
  texts: Text[];
  drawings: Drawing[];
  shapes: Shape[];
  nextId: number;
}

export interface BoardReference {
  id: string;
  name: string;
}

export type BoardAction =
  | { type: 'ADD'; p: Partial<Node> & { id: string; type: string; x: number; y: number } }
  | { type: 'DUPLICATE'; p: string }
  | { type: 'UPD'; p: Partial<Node> & { id: string } }
  | { type: 'DEL'; p: string }
  | { type: 'CONN'; p: { from: string; to: string; color?: string } }
  | { type: 'UPD_CONN'; p: Partial<Connection> & { id: string } }
  | { type: 'DEL_CONN'; p: string }
  | { type: 'ADD_GROUP'; p: Group }
  | { type: 'UPD_GROUP'; p: Partial<Group> & { id: string } }
  | { type: 'DEL_GROUP'; p: string }
  | { type: 'ADD_TEXT'; p: Text }
  | { type: 'DUP_TEXT'; p: string }
  | { type: 'UPD_TEXT'; p: Partial<Text> & { id: string } }
  | { type: 'DEL_TEXT'; p: string }
  | { type: 'ADD_DRAWING'; p: Drawing }
  | { type: 'DEL_DRAWING'; p: string }
  | { type: 'ERASE_AT'; p: { bx: number; by: number; r: number } }
  | { type: 'ADD_SHAPE'; p: Shape }
  | { type: 'UPD_SHAPE'; p: Partial<Shape> & { id: string } }
  | { type: 'DEL_SHAPE'; p: string }
  | { type: 'SET_DRAW_STATE'; p: { drawings: Drawing[]; shapes: Shape[] } }
  | { type: 'CLEAR_DRAWINGS' }
  | { type: 'CLEAR_SHAPES' }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; p: Partial<BoardState> };
