import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Document, AIConfig, ChatMessage, ViewType, FileItem, SpreadsheetData } from '@/types';

interface AppState {
  // Files
  files: FileItem[];
  currentFileId: string | null;
  view: ViewType;
  
  // Documents
  documents: Record<string, Document>;
  
  // Spreadsheets
  spreadsheets: Record<string, SpreadsheetData>;
  
  // AI
  aiConfig: AIConfig;
  chatMessages: ChatMessage[];
  isAIProcessing: boolean;
  
  // UI
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  
  // Actions
  setView: (view: ViewType) => void;
  setCurrentFile: (fileId: string | null) => void;
  createFile: (name: string, type: 'document' | 'spreadsheet', parentId?: string | null) => string;
  updateFile: (fileId: string, updates: Partial<FileItem>) => void;
  deleteFile: (fileId: string) => void;
  updateDocument: (fileId: string, content: string) => void;
  updateSpreadsheet: (fileId: string, data: SpreadsheetData) => void;
  setAIConfig: (config: Partial<AIConfig>) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  setAIPanelOpen: (open: boolean) => void;
}

const createDefaultSpreadsheet = (): SpreadsheetData => ({
  cells: {},
  rowCount: 50,
  colCount: 26,
  colWidths: {},
  rowHeights: {},
});

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      files: [],
      currentFileId: null,
      view: 'welcome',
      documents: {},
      spreadsheets: {},
      aiConfig: {
        provider: null,
        baseUrl: 'http://localhost:1234',
        model: '',
        isConnected: false,
      },
      chatMessages: [],
      isAIProcessing: false,
      sidebarOpen: true,
      aiPanelOpen: false,

      // Actions
      setView: (view) => set({ view }),
      
      setCurrentFile: (fileId) => {
        const { files } = get();
        const file = files.find(f => f.id === fileId);
        if (file) {
          set({ 
            currentFileId: fileId, 
            view: file.type === 'document' ? 'editor' : 'spreadsheet' 
          });
        } else {
          set({ currentFileId: null, view: 'welcome' });
        }
      },

      createFile: (name, type, parentId = null) => {
        const id = generateId();
        const now = Date.now();
        const newFile: FileItem = {
          id,
          name,
          type,
          parentId,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          files: [...state.files, newFile],
        }));
        
        if (type === 'document') {
          set((state) => ({
            documents: {
              ...state.documents,
              [id]: {
                id,
                name,
                type: 'document',
                content: '<p></p>',
                createdAt: now,
                updatedAt: now,
              },
            },
          }));
        } else {
          set((state) => ({
            spreadsheets: {
              ...state.spreadsheets,
              [id]: createDefaultSpreadsheet(),
            },
          }));
        }
        
        return id;
      },

      updateFile: (fileId, updates) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === fileId ? { ...f, ...updates, updatedAt: Date.now() } : f
          ),
        }));
      },

      deleteFile: (fileId) => {
        set((state) => {
          const newFiles = state.files.filter((f) => f.id !== fileId);
          const newDocuments = { ...state.documents };
          const newSpreadsheets = { ...state.spreadsheets };
          delete newDocuments[fileId];
          delete newSpreadsheets[fileId];
          
          return {
            files: newFiles,
            documents: newDocuments,
            spreadsheets: newSpreadsheets,
            currentFileId: state.currentFileId === fileId ? null : state.currentFileId,
            view: state.currentFileId === fileId ? 'welcome' : state.view,
          };
        });
      },

      updateDocument: (fileId, content) => {
        set((state) => ({
          documents: {
            ...state.documents,
            [fileId]: {
              ...state.documents[fileId],
              content,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      updateSpreadsheet: (fileId, data) => {
        set((state) => ({
          spreadsheets: {
            ...state.spreadsheets,
            [fileId]: data,
          },
        }));
      },

      setAIConfig: (config) => {
        set((state) => ({
          aiConfig: { ...state.aiConfig, ...config },
        }));
      },

      addChatMessage: (message) => {
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        }));
      },

      clearChat: () => {
        set({ chatMessages: [] });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      toggleAIPanel: () => {
        set((state) => ({ aiPanelOpen: !state.aiPanelOpen }));
      },

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
    }),
    {
      name: 'ai-office-suite-storage',
      partialize: (state) => ({
        files: state.files,
        documents: state.documents,
        spreadsheets: state.spreadsheets,
        aiConfig: state.aiConfig,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
