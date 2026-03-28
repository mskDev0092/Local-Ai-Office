import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AIService } from '@/services/aiService';
import {
  FileText,
  Table2,
  Cpu,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Shield,
  CloudOff,
  Settings,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function WelcomeView() {
  const {
    aiConfig,
    setAIConfig,
    createFile,
    setCurrentFile,
    files,
    setView,
  } = useAppStore();

  const [isDetecting, setIsDetecting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const config = await AIService.autoDetect();
      if (config) {
        setAIConfig(config);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const service = new AIService(aiConfig);
      const connected = await service.testConnection();
      setAIConfig({ isConnected: connected });
      setTestStatus(connected ? 'success' : 'error');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const createNewDocument = () => {
    const id = createFile('Untitled Document', 'document');
    setCurrentFile(id);
  };

  const createNewSpreadsheet = () => {
    const id = createFile('Untitled Spreadsheet', 'spreadsheet');
    setCurrentFile(id);
  };

  const recentFiles = files
    .filter((f) => f.type !== 'folder')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#0e2244] to-[#0564d2] text-white py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              AI-Powered
            </Badge>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Welcome to AI Office Suite
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl">
            A modern, AI-powered office suite that works with your local language models. 
            Create documents, spreadsheets, and get intelligent assistance - all while keeping your data private.
          </p>
          <div className="flex gap-4">
            <Button
              size="lg"
              className="bg-white text-[#0564d2] hover:bg-blue-50"
              onClick={createNewDocument}
            >
              <FileText className="w-5 h-5 mr-2" />
              New Document
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={createNewSpreadsheet}
            >
              <Table2 className="w-5 h-5 mr-2" />
              New Spreadsheet
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={createNewDocument}>
            <CardHeader>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-[#0564d2]" />
              </div>
              <CardTitle>Document Editor</CardTitle>
              <CardDescription>
                Rich text editing with AI-powered writing assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-[#0564d2] text-sm font-medium">
                Create Document
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={createNewSpreadsheet}>
            <CardHeader>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Table2 className="w-5 h-5 text-green-600" />
              </div>
              <CardTitle>Spreadsheets</CardTitle>
              <CardDescription>
                Powerful spreadsheets with formulas and formatting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-green-600 text-sm font-medium">
                Create Spreadsheet
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setView('editor')}>
            <CardHeader>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5 text-purple-600" />
              </div>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>
                Get help with writing, editing, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-purple-600 text-sm font-medium">
                Open AI Panel
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    AI Configuration
                  </CardTitle>
                  <CardDescription>
                    Connect to your local AI provider
                  </CardDescription>
                </div>
                <Badge
                  variant={aiConfig.isConnected ? 'default' : 'secondary'}
                  className={cn(
                    aiConfig.isConnected && 'bg-green-500'
                  )}
                >
                  {aiConfig.isConnected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleAutoDetect}
                  disabled={isDetecting}
                  variant="outline"
                >
                  {isDetecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Auto-detect
                </Button>
                <Button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || !aiConfig.provider}
                  variant={testStatus === 'success' ? 'default' : testStatus === 'error' ? 'destructive' : 'outline'}
                >
                  {testStatus === 'testing' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : testStatus === 'success' ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : testStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  {testStatus === 'success' ? 'Connected' : testStatus === 'error' ? 'Failed' : 'Test Connection'}
                </Button>
              </div>

              {aiConfig.isConnected && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">Connected to {aiConfig.provider}</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Model: {aiConfig.model}
                  </p>
                  <p className="text-sm text-green-700">
                    URL: {aiConfig.baseUrl}
                  </p>
                </div>
              )}

              {!aiConfig.isConnected && !isDetecting && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium">
                        No AI provider detected
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Make sure LM Studio or Ollama is running on your machine, then click "Auto-detect".
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Provider</Label>
                <div className="flex gap-2">
                  <Button
                    variant={aiConfig.provider === 'lmstudio' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAIConfig({ provider: 'lmstudio', baseUrl: 'http://localhost:1234' })}
                    className={aiConfig.provider === 'lmstudio' ? 'bg-[#0564d2]' : ''}
                  >
                    LM Studio
                  </Button>
                  <Button
                    variant={aiConfig.provider === 'ollama' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAIConfig({ provider: 'ollama', baseUrl: 'http://localhost:11434' })}
                    className={aiConfig.provider === 'ollama' ? 'bg-[#0564d2]' : ''}
                  >
                    Ollama
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAIConfig({ baseUrl: e.target.value })}
                  placeholder="http://localhost:1234"
                />
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={aiConfig.model}
                  onChange={(e) => setAIConfig({ model: e.target.value })}
                  placeholder="Enter model name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Files
              </CardTitle>
              <CardDescription>
                Your recently edited documents and spreadsheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs mt-1">Create your first document or spreadsheet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => setCurrentFile(file.id)}
                    >
                      {file.type === 'document' ? (
                        <FileText className="w-5 h-5 text-[#0564d2]" />
                      ) : (
                        <Table2 className="w-5 h-5 text-green-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(file.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={createNewDocument}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Document
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={createNewSpreadsheet}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Spreadsheet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#0564d2]" />
              </div>
              <div>
                <h3 className="font-medium mb-1">AI Writing</h3>
                <p className="text-sm text-gray-600">
                  Get help with writing, editing, and formatting using your local AI
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Table2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Spreadsheets</h3>
                <p className="text-sm text-gray-600">
                  Full-featured spreadsheets with formulas, formatting, and more
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CloudOff className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Local-First</h3>
                <p className="text-sm text-gray-600">
                  All your data stays on your device. No cloud required.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Privacy First</h3>
                <p className="text-sm text-gray-600">
                  Work with sensitive documents knowing your data never leaves your machine
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
