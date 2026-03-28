import type { AIConfig, AIRequest } from '@/types';

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  updateConfig(config: AIConfig) {
    this.config = config;
  }

  static async detectLMStudio(): Promise<{ available: boolean; models: string[]; baseUrl: string }> {
    const baseUrls = ['http://localhost:1234', 'http://127.0.0.1:1234'];
    
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/v1/models`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
        
        if (response.ok) {
          const data = await response.json();
          const models = data.data?.map((m: { id: string }) => m.id) || [];
          return { available: true, models, baseUrl };
        }
      } catch {
        // Continue to next URL
      }
    }
    
    return { available: false, models: [], baseUrl: 'http://localhost:1234' };
  }

  static async detectOllama(): Promise<{ available: boolean; models: string[]; baseUrl: string }> {
    const baseUrls = ['http://localhost:11434', 'http://127.0.0.1:11434'];
    
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
        
        if (response.ok) {
          const data = await response.json();
          const models = data.models?.map((m: { name: string }) => m.name) || [];
          return { available: true, models, baseUrl };
        }
      } catch {
        // Continue to next URL
      }
    }
    
    return { available: false, models: [], baseUrl: 'http://localhost:11434' };
  }

  static async autoDetect(): Promise<AIConfig | null> {
    const [lmStudio, ollama] = await Promise.all([
      this.detectLMStudio(),
      this.detectOllama(),
    ]);

    if (lmStudio.available && lmStudio.models.length > 0) {
      return {
        provider: 'lmstudio',
        baseUrl: lmStudio.baseUrl,
        model: lmStudio.models[0],
        isConnected: true,
      };
    }

    if (ollama.available && ollama.models.length > 0) {
      return {
        provider: 'ollama',
        baseUrl: ollama.baseUrl,
        model: ollama.models[0],
        isConnected: true,
      };
    }

    return null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.provider) return false;

    try {
      if (this.config.provider === 'lmstudio') {
        const response = await fetch(`${this.config.baseUrl}/v1/models`, {
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } else {
        const response = await fetch(`${this.config.baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      }
    } catch {
      return false;
    }
  }

  async *streamCompletion(messages: { role: string; content: string }[]): AsyncGenerator<string> {
    if (!this.config.provider || !this.config.isConnected) {
      throw new Error('AI provider not configured');
    }

    if (this.config.provider === 'lmstudio') {
      yield* this.streamLMStudio(messages);
    } else {
      yield* this.streamOllama(messages);
    }
  }

  private async *streamLMStudio(messages: { role: string; content: string }[]): AsyncGenerator<string> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  private async *streamOllama(messages: { role: string; content: string }[]): AsyncGenerator<string> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            yield parsed.message.content;
          }
          if (parsed.done) return;
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  async processRequest(request: AIRequest): Promise<string> {
    const systemPrompts: Record<string, string> = {
      write: 'You are a helpful writing assistant. Write clear, engaging content based on the user\'s request.',
      edit: 'You are an editor. Improve the text while maintaining its meaning and tone.',
      format: 'You are a formatting assistant. Reformat the text according to the user\'s instructions.',
      summarize: 'You are a summarization assistant. Create a concise summary of the provided text.',
      explain: 'You are a helpful teacher. Explain the content clearly and thoroughly.',
      chat: 'You are a helpful AI assistant in an office suite application.',
    };

    const messages = [
      { role: 'system', content: systemPrompts[request.action] || systemPrompts.chat },
    ];

    if (request.context) {
      messages.push({ role: 'user', content: `Here is the context:\n\n${request.context}` });
    }

    messages.push({ role: 'user', content: request.prompt });

    let result = '';
    for await (const chunk of this.streamCompletion(messages)) {
      result += chunk;
    }

    return result;
  }

  buildWritingPrompt(action: string, selectedText: string, instruction?: string): AIRequest {
    const prompts: Record<string, string> = {
      improve: `Improve the following text to make it clearer and more professional:\n\n${selectedText}`,
      shorten: `Make the following text more concise while keeping the key points:\n\n${selectedText}`,
      lengthen: `Expand the following text with more detail and explanation:\n\n${selectedText}`,
      formal: `Rewrite the following text in a more formal tone:\n\n${selectedText}`,
      casual: `Rewrite the following text in a more casual, conversational tone:\n\n${selectedText}`,
      fix: `Fix any grammar, spelling, or punctuation errors in the following text:\n\n${selectedText}`,
      summarize: `Summarize the following text:\n\n${selectedText}`,
      bullet: `Convert the following text into bullet points:\n\n${selectedText}`,
    };

    return {
      action: 'edit',
      prompt: instruction ? `${instruction}\n\n${selectedText}` : (prompts[action] || prompts.improve),
    };
  }
}

export const createAIService = (config: AIConfig) => new AIService(config);
