import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  Copy,
  Plus,
} from "lucide-react";
import { AIService } from "@/services/aiService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
    updateDocument,
    spreadsheets,
    updateSpreadsheet,
    view,
  } = useAppStore();

  const [input, setInput] = useState("");
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
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setInput("");
    setIsProcessing(true);

    try {
      const aiService = new AIService(aiConfig);

      // Build context from current document/spreadsheet
      let docContext = "";
      let sheetContext = "";
      let fileInfo = "";

      if (currentFileId) {
        if (view === "editor" && documents[currentFileId]) {
          const doc = documents[currentFileId];
          docContext = doc.content.replace(/<[^>]*>/g, " ").substring(0, 3000);
          fileInfo = `Currently editing document: "${documents[currentFileId]?.name || "Untitled"}"`;
        } else if (view === "spreadsheet" && spreadsheets[currentFileId]) {
          const sheet = spreadsheets[currentFileId];
          const cellSummary = Object.entries(sheet.cells)
            .slice(0, 50)
            .map(([id, cell]) => `${id}: ${cell.value || "(empty)"}`)
            .join(", ");
          sheetContext = `Spreadsheet with ${sheet.rowCount} rows, ${sheet.colCount} columns. Sample cells: ${cellSummary}`;
          fileInfo = `Currently editing spreadsheet: "${documents[currentFileId]?.name || "Untitled"}"`;
        }
      }

      const contextPrompt = [
        fileInfo && fileInfo,
        docContext && `Document context:\n${docContext}`,
        sheetContext && `Spreadsheet context:\n${sheetContext}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const messages = [
        {
          role: "system",
          content: `You are an AI assistant in an office suite application. You help users with writing, editing, formulas, data analysis, and general questions. You work with both text documents and spreadsheets. Keep responses concise and actionable. ${contextPrompt ? "The user is currently working on something. Use the context when relevant." : ""}`,
        },
        ...(contextPrompt ? [{ role: "user", content: contextPrompt }] : []),
        ...chatMessages
          .slice(-15)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage.content },
      ];

      let response = "";
      for await (const chunk of aiService.streamCompletion(messages)) {
        response += chunk;
      }

      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      });
    } catch (error) {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    input,
    aiConfig,
    addChatMessage,
    chatMessages,
    currentFileId,
    documents,
    spreadsheets,
    view,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleInsertIntoDoc = useCallback(
    (content: string) => {
      if (!currentFileId || !documents[currentFileId]) {
        toast.error("No document open");
        return;
      }

      const currentDoc = documents[currentFileId];
      const newContent =
        currentDoc.content + `\n<p>${content.replace(/\n/g, "</p>\n<p>")}</p>`;
      updateDocument(currentFileId, newContent);
      toast.success("Content inserted");
    },
    [currentFileId, documents, updateDocument],
  );

  const handleInsertFormula = useCallback(
    (content: string) => {
      if (!currentFileId || !spreadsheets[currentFileId]) {
        toast.error("No spreadsheet open");
        return;
      }

      const formula = content
        .split("\n")[0]
        .replace(/^[^=]*/, "")
        .trim();

      if (!formula.startsWith("=")) {
        toast.error("Formula must start with =");
        return;
      }

      const sheet = spreadsheets[currentFileId];
      updateSpreadsheet(currentFileId, {
        ...sheet,
        lastUsedFormula: formula,
      });

      toast.success("Formula ready to insert. Click a cell and press Ctrl+V");
    },
    [currentFileId, spreadsheets, updateSpreadsheet],
  );

  const handleCopyContent = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }, []);

  if (!aiPanelOpen) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              aiConfig.isConnected
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-400",
            )}
          >
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-sm">AI Assistant</h3>
            <p className="text-xs text-gray-500">
              {aiConfig.isConnected
                ? aiConfig.provider === "lmstudio"
                  ? "LM Studio"
                  : "Ollama"
                : "Not connected"}
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
                    value={aiConfig.provider || ""}
                    onValueChange={(value) =>
                      setAIConfig({ provider: value as "lmstudio" | "ollama" })
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
      <div className="flex-1 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {chatMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Start a conversation with AI</p>
              <p className="text-xs mt-2">
                Ask for writing help, formulas, explanations, or general
                assistance
              </p>
              {currentFileId && (
                <p className="text-xs mt-3 text-blue-400">
                  {view === "editor"
                    ? "📄 Document context active"
                    : "📊 Spreadsheet context active"}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.role === "user"
                        ? "bg-[#0564d2] text-white"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className={cn(
                        "rounded-lg p-3 text-sm max-w-[85%]",
                        message.role === "user"
                          ? "bg-[#0564d2] text-white"
                          : "bg-gray-100 text-gray-800",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <span
                        className={cn(
                          "text-xs mt-1 block",
                          message.role === "user"
                            ? "text-blue-100"
                            : "text-gray-400",
                        )}
                      >
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    {message.role === "assistant" && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleCopyContent(message.content)}
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        {view === "editor" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                            onClick={() => handleInsertIntoDoc(message.content)}
                            title="Insert into document"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Insert
                          </Button>
                        )}
                        {view === "spreadsheet" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                            onClick={() => handleInsertFormula(message.content)}
                            title="Insert formula in current cell"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Formula
                          </Button>
                        )}
                      </div>
                    )}
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
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              aiConfig.isConnected
                ? "Ask AI anything..."
                : "Configure AI to start chatting"
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
