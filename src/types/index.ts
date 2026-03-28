export interface Document {
  id: string;
  name: string;
  type: 'document' | 'spreadsheet';
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Cell {
  value: string;
  formula?: string;
  computed?: number | string;
  style?: CellStyle;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface SpreadsheetData {
  cells: Record<string, Cell>;
  rowCount: number;
  colCount: number;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
}

export interface AIConfig {
  provider: 'lmstudio' | 'ollama' | null;
  baseUrl: string;
  model: string;
  isConnected: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIRequest {
  prompt: string;
  context?: string;
  action: 'write' | 'edit' | 'format' | 'summarize' | 'explain' | 'chat';
}

export type ViewType = 'editor' | 'spreadsheet' | 'welcome';

export interface FileItem {
  id: string;
  name: string;
  type: 'document' | 'spreadsheet' | 'folder';
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}
