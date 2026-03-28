import { useEffect, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Undo,
  Redo,
  Sparkles,
  Wand2,
  Type,
  Check,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AIService } from '@/services/aiService';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  fileId: string;
}

export function RichTextEditor({ fileId }: RichTextEditorProps) {
  const { documents, updateDocument, aiConfig, addChatMessage } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const document = documents[fileId];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing or use AI to help you write...',
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: document?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      updateDocument(fileId, editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && document?.content && editor.getHTML() !== document.content) {
      editor.commands.setContent(document.content);
    }
  }, [fileId, editor, document?.content]);

  const handleAIAction = useCallback(async (action: string, instruction?: string) => {
    if (!editor || !aiConfig.isConnected) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (!selectedText && action !== 'write') {
      addChatMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Please select some text first to use this AI feature.',
        timestamp: Date.now(),
      });
      return;
    }

    setIsProcessing(true);

    try {
      const aiService = new AIService(aiConfig);
      const request = aiService.buildWritingPrompt(action, selectedText, instruction);
      const result = await aiService.processRequest(request);

      if (action === 'write') {
        editor.chain().focus().insertContent(result).run();
      } else {
        editor.chain().focus().deleteSelection().insertContent(result).run();
      }

      addChatMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `AI ${action} completed successfully.`,
        timestamp: Date.now(),
      });
    } catch (error) {
      addChatMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to process request'}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsProcessing(false);
      setShowAIInput(false);
      setAiPrompt('');
    }
  }, [editor, aiConfig, addChatMessage]);

  const handleCustomAIPrompt = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    await handleAIAction('custom', aiPrompt);
  }, [aiPrompt, handleAIAction]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    icon: Icon,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    icon: React.ElementType;
    title: string;
  }) => (
    <Toggle
      pressed={isActive}
      onPressedChange={onClick}
      className={cn(
        'h-8 w-8 p-0 data-[state=on]:bg-[#0564d2]/10 data-[state=on]:text-[#0564d2]'
      )}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </Toggle>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50/50 flex-wrap">
        {/* History */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            title="Undo"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            title="Redo"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Style */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            title="Bold"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            title="Italic"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon={UnderlineIcon}
            title="Underline"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            icon={Strikethrough}
            title="Strikethrough"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            title="Heading 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            title="Heading 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            icon={Heading3}
            title="Heading 3"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            title="Numbered List"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            icon={AlignLeft}
            title="Align Left"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            icon={AlignCenter}
            title="Align Center"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            icon={AlignRight}
            title="Align Right"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Other */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon={Quote}
            title="Quote"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            icon={Code}
            title="Code Block"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            icon={Highlighter}
            title="Highlight"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* AI Actions */}
        {aiConfig.isConnected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-[#0564d2] hover:bg-[#0564d2]/10"
                disabled={isProcessing}
              >
                <Sparkles className="w-4 h-4" />
                AI
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleAIAction('write')}>
                <Wand2 className="w-4 h-4 mr-2" />
                Write with AI
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('improve')}>
                <Type className="w-4 h-4 mr-2" />
                Improve Writing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('shorten')}>
                <span className="w-4 h-4 mr-2 text-sm font-bold">--</span>
                Make Shorter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('lengthen')}>
                <span className="w-4 h-4 mr-2 text-sm font-bold">++</span>
                Make Longer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('formal')}>
                <span className="w-4 h-4 mr-2 text-sm">🎩</span>
                More Formal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('casual')}>
                <span className="w-4 h-4 mr-2 text-sm">😊</span>
                More Casual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('fix')}>
                <Check className="w-4 h-4 mr-2" />
                Fix Grammar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('summarize')}>
                <span className="w-4 h-4 mr-2 text-sm">∑</span>
                Summarize
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('bullet')}>
                <List className="w-4 h-4 mr-2" />
                Convert to Bullets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* AI Input Overlay */}
      {showAIInput && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0564d2]/5 border-b border-[#0564d2]/20">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Tell AI what to do with the selected text..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomAIPrompt();
              if (e.key === 'Escape') {
                setShowAIInput(false);
                setAiPrompt('');
              }
            }}
            autoFocus
          />
          <Button
            size="sm"
            className="bg-[#0564d2] hover:bg-[#0558b9]"
            onClick={handleCustomAIPrompt}
            disabled={!aiPrompt.trim() || isProcessing}
          >
            {isProcessing ? '...' : 'Go'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowAIInput(false);
              setAiPrompt('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-8 min-h-full focus:outline-none"
        />
      </div>
    </div>
  );
}
