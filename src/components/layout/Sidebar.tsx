import { useState } from 'react';
import { 
  FileText, 
  Table2, 
  Plus, 
  Folder, 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Trash2,
  Edit2,
  FilePlus,
  Table,
  Cpu,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { FileItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { 
    files, 
    currentFileId, 
    sidebarOpen, 
    setCurrentFile, 
    createFile, 
    deleteFile, 
    updateFile,
    toggleSidebar,
    setView,
    setAIPanelOpen,
    aiConfig,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFileType, setNewFileType] = useState<'document' | 'spreadsheet'>('document');
  const [newFileName, setNewFileName] = useState('');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const id = createFile(newFileName.trim(), newFileType);
      setCurrentFile(id);
      setNewFileName('');
      setNewFileDialogOpen(false);
    }
  };

  const handleRename = (fileId: string) => {
    if (newName.trim()) {
      updateFile(fileId, { name: newName.trim() });
      setRenamingFile(null);
      setNewName('');
    }
  };

  const startRename = (file: FileItem) => {
    setRenamingFile(file.id);
    setNewName(file.name);
  };

  const renderFileTree = (parentId: string | null = null, depth = 0) => {
    const items = files.filter((f) => f.parentId === parentId);

    return items.map((file) => {
      const isFolder = file.type === 'folder';
      const isExpanded = expandedFolders.has(file.id);
      const isSelected = currentFileId === file.id;
      const Icon = isFolder ? Folder : file.type === 'document' ? FileText : Table2;

      return (
        <div key={file.id}>
          <div
            className={cn(
              'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
              isSelected 
                ? 'bg-[#0564d2]/10 text-[#0564d2]' 
                : 'hover:bg-gray-100 text-gray-700',
              depth > 0 && 'ml-4'
            )}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            onClick={() => {
              if (isFolder) {
                toggleFolder(file.id);
              } else {
                setCurrentFile(file.id);
              }
            }}
          >
            {isFolder && (
              <span className="w-4 h-4 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </span>
            )}
            {!isFolder && <span className="w-4" />}
            
            <Icon className={cn(
              'w-4 h-4 flex-shrink-0',
              isFolder && 'text-amber-500'
            )} />
            
            {renamingFile === file.id ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => handleRename(file.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(file.id);
                  if (e.key === 'Escape') {
                    setRenamingFile(null);
                    setNewName('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-6 text-sm py-0 px-1"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm truncate">{file.name}</span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startRename(file)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => deleteFile(file.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {isFolder && isExpanded && renderFileTree(file.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40',
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0564d2] to-[#0e2244] rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">AI Office</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="p-3 space-y-2">
            <Dialog open={newFileDialogOpen} onOpenChange={setNewFileDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start gap-2 bg-[#0564d2] hover:bg-[#0558b9]">
                  <Plus className="w-4 h-4" />
                  New File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex gap-2">
                    <Button
                      variant={newFileType === 'document' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1 gap-2',
                        newFileType === 'document' && 'bg-[#0564d2]'
                      )}
                      onClick={() => setNewFileType('document')}
                    >
                      <FilePlus className="w-4 h-4" />
                      Document
                    </Button>
                    <Button
                      variant={newFileType === 'spreadsheet' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1 gap-2',
                        newFileType === 'spreadsheet' && 'bg-[#0564d2]'
                      )}
                      onClick={() => setNewFileType('spreadsheet')}
                    >
                      <Table className="w-4 h-4" />
                      Spreadsheet
                    </Button>
                  </div>
                  <Input
                    placeholder="File name"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                  />
                  <Button 
                    className="w-full bg-[#0564d2] hover:bg-[#0558b9]"
                    onClick={handleCreateFile}
                    disabled={!newFileName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setAIPanelOpen(true)}
            >
              <Cpu className={cn(
                'w-4 h-4',
                aiConfig.isConnected ? 'text-green-500' : 'text-gray-400'
              )} />
              AI Assistant
              {aiConfig.isConnected && (
                <span className="ml-auto text-xs text-green-600">Connected</span>
              )}
            </Button>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-auto px-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
              Files
            </div>
            {files.length === 0 ? (
              <div className="text-sm text-gray-400 px-3 py-4 text-center">
                No files yet. Create your first document or spreadsheet.
              </div>
            ) : (
              renderFileTree()
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-gray-600"
              onClick={() => setView('welcome')}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
