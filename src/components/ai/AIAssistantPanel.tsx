import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Send,
  X,
  Bot,
  User,
  Loader2,
  Settings,
  Check,
  AlertCircle,
  Sparkles,
  Trash2,
  Cpu,
} from 'lucide-react';
import { AIService } from '@/services/aiService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AIAssistantPanel() {
  const {
    aiConfig,
    setAIConfig,
    chatMessages,
    addChatMessage,
    clearChat,
    aiPanelOpen,
    setAIPanelOpen,
    documents,
    currentFileId,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleDetect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const config = await AIService.autoDetect();
      if (config) {
        setAIConfig(config);
      }
    } finally {
      setIsDetecting(false);
    }
  }, [setAIConfig]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !aiConfig.isConnected) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setInput('');
    setIsProcessing(true);

    try {
      const aiService = new AIService(aiConfig);
      
      // Build context from current document if available
      let context = '';
      if (currentFileId && documents[currentFileId]) {
        const doc = documents[currentFileId];
        // Strip HTML tags for context
        context = doc.content.replace(/<[^>]*>/g, ' ').substring(0, 2000);
      }

      const messages = [
        {
          role: 'system',
          content: `You are an AI assistant in an office suite application. You help users with writing, editing, and general questions. ${context ? 'The user is currently working on a document. Use the context when relevant.' : ''}`,
        },
        ...(context ? [{ role: 'user', content: `Current document context:\n${context}` }] : []),
        ...chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content },
      ];

      let response = '';
      for await (const chunk of aiService.streamCompletion(messages)) {
        response += chunk;
      }

      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });
    } catch (error) {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [input, aiConfig, addChatMessage, chatMessages, currentFileId, documents]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!aiPanelOpen) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            aiConfig.isConnected
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-400'
          )}>
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-sm">AI Assistant</h3>
            <p className="text-xs text-gray-500">
              {aiConfig.isConnected
                ? aiConfig.provider === 'lmstudio'
                  ? 'LM Studio'
                  : 'Ollama'
                : 'Not connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>AI Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-detect AI provider</span>
                  <Button
                    size="sm"
                    onClick={handleDetect}
                    disabled={isDetecting}
                  >
                    {isDetecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Cpu className="w-4 h-4 mr-2" />
                        Detect
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={aiConfig.provider || ''}
                    onValueChange={(value) =>
                      setAIConfig({ provider: value as 'lmstudio' | 'ollama' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lmstudio">LM Studio</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                    </SelectContent>
                  </Select>
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
                    placeholder="Select or enter model name"
                  />
                </div>

                <Button
                  className="w-full bg-[#0564d2] hover:bg-[#0558b9]"
                  onClick={async () => {
                    const service = new AIService(aiConfig);
                    const connected = await service.testConnection();
                    setAIConfig({ isConnected: connected });
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>

                {!aiConfig.isConnected && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Not connected to AI provider</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setAIPanelOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Start a conversation with AI</p>
            <p className="text-xs mt-2">
              Ask for writing help, explanations, or general assistance
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-[#0564d2] text-white'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg p-3 text-sm',
                    message.role === 'user'
                      ? 'bg-[#0564d2] text-white'
                      : 'bg-gray-100 text-gray-800'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <span
                    className={cn(
                      'text-xs mt-1 block',
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    )}
                  >
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              aiConfig.isConnected
                ? 'Ask AI anything...'
                : 'Configure AI to start chatting'
            }
            disabled={!aiConfig.isConnected || isProcessing}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || !aiConfig.isConnected || isProcessing}
            className="bg-[#0564d2] hover:bg-[#0558b9]"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {chatMessages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-gray-400 hover:text-gray-600"
            onClick={clearChat}
          >
            <Trash2 className="w-3 h-3 mr-2" />
            Clear conversation
          </Button>
        )}
      </div>
    </div>
  );
}
