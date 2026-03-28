import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Spreadsheet } from '@/components/spreadsheet/Spreadsheet';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { WelcomeView } from '@/components/WelcomeView';
import { AIService } from '@/services/aiService';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const {
    view,
    currentFileId,
    sidebarOpen,
    aiPanelOpen,
    aiConfig,
    setAIConfig,
    files,
  } = useAppStore();

  // Auto-detect AI on first load
  useEffect(() => {
    if (!aiConfig.isConnected && !aiConfig.provider) {
      AIService.autoDetect().then((config) => {
        if (config) {
          setAIConfig(config);
          toast.success(`Connected to ${config.provider === 'lmstudio' ? 'LM Studio' : 'Ollama'}`, {
            description: `Model: ${config.model}`,
          });
        }
      }).catch(() => {
        // Silent fail - user can manually configure
      });
    }
  }, []);

  // Create welcome document on first load if no files
  useEffect(() => {
    if (files.length === 0) {
      const { createFile } = useAppStore.getState();
      const id = createFile('Welcome Document', 'document');
      const { updateDocument, setCurrentFile } = useAppStore.getState();
      updateDocument(
        id,
        `<h1>Welcome to AI Office Suite</h1>
<p>This is your personal AI-powered office suite that works entirely on your local machine.</p>
<h2>Getting Started</h2>
<ul>
  <li><strong>Create documents</strong> - Rich text editing with AI assistance</li>
  <li><strong>Build spreadsheets</strong> - Full-featured spreadsheets with formulas</li>
  <li><strong>AI Assistant</strong> - Get help with writing, editing, and more</li>
</ul>
<h2>AI Configuration</h2>
<p>To use AI features, make sure you have one of the following running:</p>
<ul>
  <li><strong>LM Studio</strong> - Download from <a href="https://lmstudio.ai">lmstudio.ai</a></li>
  <li><strong>Ollama</strong> - Download from <a href="https://ollama.ai">ollama.ai</a></li>
</ul>
<p>The app will auto-detect your AI provider. You can also configure it manually in Settings.</p>
<h2>Privacy First</h2>
<p>All your data stays on your device. No cloud, no tracking, no data sharing.</p>
<p>Start creating by clicking "New File" in the sidebar!</p>`
      );
      setCurrentFile(id);
    }
  }, [files.length]);

  const renderContent = () => {
    switch (view) {
      case 'editor':
        if (currentFileId) {
          return <RichTextEditor fileId={currentFileId} />;
        }
        return <WelcomeView />;
      case 'spreadsheet':
        if (currentFileId) {
          return <Spreadsheet fileId={currentFileId} />;
        }
        return <WelcomeView />;
      case 'welcome':
      default:
        return <WelcomeView />;
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'ml-0'
        )}
      >
        {/* Top Bar */}
        <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
          <div className="flex items-center gap-4">
            {currentFileId && (
              <span className="text-sm text-gray-500">
                {files.find((f) => f.id === currentFileId)?.name || 'Untitled'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {aiConfig.isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                AI Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                AI Offline
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">{renderContent()}</div>
          {aiPanelOpen && <AIAssistantPanel />}
        </div>
      </main>

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
