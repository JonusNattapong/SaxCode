import { Anthropic } from '@anthropic-ai/sdk';
import { getAnthropicTools, getOpenAITools, tools } from '../tools/definitions.ts';
import { SYSTEM_PROMPT } from './systemPrompt.ts';
import { PROVIDERS, ProviderType } from './providers.ts';
import { logUsage } from '../utils/usage.ts';
import fs from 'fs/promises';
import path from 'path';

const SENSITIVE_TOOLS = ['run_command', 'write_file', 'git_commit', 'save_knowledge'];
const SESSION_DIR = '.saxcode_sessions';

export type OutputStyle = 'default' | 'Explanatory' | 'Learning';

export class SaxAgent {
  private anthropic: Anthropic | null = null;
  private messageHistory: any[] = [];
  private provider: ProviderType;
  private model: string;
  private apiKey: string;
  private baseURL: string;
  private extraTools: any[] = [];
  private currentSessionId: string;
  private outputStyle: OutputStyle = 'default';

  private activeCallbacks: any = null;
  private isSubAgent: boolean = false;
  private subAgentRole: string = '';

  constructor(provider: ProviderType, apiKey?: string, model?: string, baseURL?: string, isSubAgent = false, roleName = '') {
    const config = PROVIDERS[provider] || PROVIDERS.anthropic;
    this.provider = provider;
    this.baseURL = baseURL || config.baseURL;
    this.model = model || config.defaultModel;
    this.apiKey = apiKey || (config.apiKeyEnv ? process.env[config.apiKeyEnv] : '') || '';
    
    this.currentSessionId = `session-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.isSubAgent = isSubAgent;
    this.subAgentRole = roleName;
    
    // Inject Swarm Capablities (Only for Main Agent)
    if (!this.isSubAgent) {
        this.addExtraTool({
            name: 'delegate_task',
            description: 'Delegate a specific task or research node to a specialized autonomous sub-agent.',
            inputSchema: {
                type: 'object',
                properties: {
                    role_name: { type: 'string', description: 'Name of the sub-agent (e.g., TargetScraper, DeepSearcher)' },
                    task_instruction: { type: 'string', description: 'Comprehensive strict instructions for the sub-agent.' }
                },
                required: ['role_name', 'task_instruction']
            },
            execute: async (args: { role_name: string, task_instruction: string }) => {
                if (!this.activeCallbacks) return "Error: UI hooks not wired.";
                
                // Spawn the child agent
                const sub = new SaxAgent(this.provider, this.apiKey, this.model, this.baseURL, true, args.role_name);
                let finalResult = '';
                
                this.activeCallbacks.onStatus(`[${args.role_name}] 🚀 Started sub-process...`);
                
                await sub.run(
                    args.task_instruction,
                    (role: string, content: string) => {
                        if (role === 'assistant' && typeof content === 'string') {
                            finalResult += content;
                        }
                    },
                    (status: string) => this.activeCallbacks.onStatus(`[${args.role_name}] ${status}`),
                    (name: string, targs: any) => {
                        this.activeCallbacks.onToolUse(`[${args.role_name}] ${name}`, targs);
                    },
                    (inT: number, outT: number) => this.activeCallbacks.onUsage(inT, outT),
                    async () => true // Subagents auto-approve standard tasks
                );
                
                return `Sub-agent ${args.role_name} has completed the task. Result:\n${finalResult}`;
            }
        });
    }

    this.rebuildClient();
  }

  // Session Management
  private getSessionPath(id: string) { return path.join(SESSION_DIR, `${id}.json`); }

  public async saveHistory() {
    try {
      await fs.mkdir(SESSION_DIR, { recursive: true });
      await fs.writeFile(this.getSessionPath(this.currentSessionId), JSON.stringify({
        id: this.currentSessionId,
        lastUpdate: new Date().toISOString(),
        history: this.messageHistory
      }, null, 2));
    } catch (e) {}
  }

  public async listSessions() {
    try {
      await fs.mkdir(SESSION_DIR, { recursive: true });
      const files = await fs.readdir(SESSION_DIR);
      return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    } catch (e) { return []; }
  }

  public async resumeSession(id: string) {
    try {
      const data = await fs.readFile(this.getSessionPath(id), 'utf-8');
      const session = JSON.parse(data);
      this.currentSessionId = id;
      this.messageHistory = session.history;
      return this.messageHistory;
    } catch (e) { return null; }
  }

  public startNewSession() {
    this.currentSessionId = `session-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.messageHistory = [];
  }

  public getHistory() { return this.messageHistory; }
  public getSessionId() { return this.currentSessionId; }

  private rebuildClient() {
    if (this.provider === 'anthropic' || this.provider === 'kilocode') {
      this.anthropic = new Anthropic({ apiKey: this.apiKey, baseURL: this.baseURL });
    } else {
      this.anthropic = null;
    }
  }

  public updateProvider(provider: ProviderType, baseURL?: string) {
    const config = PROVIDERS[provider];
    this.provider = provider;
    this.baseURL = baseURL || config.baseURL;
    this.model = config.defaultModel;
    this.apiKey = (config.apiKeyEnv ? process.env[config.apiKeyEnv] : '') || '';
    this.rebuildClient();
  }

  public updateModel(model: string) { this.model = model; }
  public updateApiKey(key: string) { this.apiKey = key; this.rebuildClient(); }
  public getApiKey() { return this.apiKey; }
  public getModel() { return this.model; }
  public getProvider() { return this.provider; }
  public addExtraTool(tool: any) { this.extraTools.push(tool); }

  public setOutputStyle(style: OutputStyle) {
    this.outputStyle = style;
  }

  public getOutputStyle() {
    return this.outputStyle;
  }

  private getSystemPrompt(): string {
    let prompt = SYSTEM_PROMPT;
    
    if (this.outputStyle === 'Explanatory') {
      prompt += `\n\n## Explanatory Mode Active\nAlways provide brief educational insights about implementation choices using:\n"✦ Insight ─────────────────────────────────────\n[2-3 key educational points]\n─────────────────────────────────────────────────"`;
    } else if (this.outputStyle === 'Learning') {
      prompt += `\n\n## Learning Mode Active\nBalance task completion with learning. For complex logic, stop and ask the user to contribute using:\n"• Learn by Doing\nContext: [why this matters]\nYour Task: [what to implement]\nGuidance: [trade-offs]"`;
    }
    
    return prompt;
  }

  public async getAvailableModels(): Promise<string[]> {
    if (this.provider === 'ollama') {
      try {
        const resp = await fetch(`${this.baseURL.replace('/v1', '')}/api/tags`);
        const data: any = await resp.json();
        return data.models.map((m: any) => m.name);
      } catch (e) { return ['qwen2.5-coder:7b', 'llama3.3']; }
    } else if (this.provider === 'anthropic') {
      return ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'];
    }
    
    // For OpenAI-compatible providers like Kilocode, DeepSeek, etc.
    try {
      const resp = await fetch(`${this.baseURL}/models`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      if (resp.ok) {
          const data: any = await resp.json();
          if (data.data && Array.isArray(data.data)) {
              return data.data.map((m: any) => m.id);
          }
      }
    } catch (e) {}

    // Fallbacks if fetch fails
    const fallbacks: Record<string, string[]> = {
        'kilocode': ['qwen3-coder-next:cloud', 'claude-3-5-sonnet-latest', 'deepseek-v3:cloud'],
        'openai': ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
        'deepseek': ['deepseek-chat', 'deepseek-reasoner'],
        'gemini': ['gemini-1.5-pro', 'gemini-1.5-flash']
    };

    return fallbacks[this.provider] || [PROVIDERS[this.provider]?.defaultModel || 'claude-3-5-sonnet-latest'];
  }

  async run(
    prompt: string, 
    onMessage: (role: string, content: string, isStreaming?: boolean) => void,
    onStatus: (status: string) => void,
    onToolUse: (name: string, args: any) => void,
    onUsage: (inputTokens: number, outputTokens: number) => void,
    onApproval: (name: string, args: any) => Promise<boolean>,
    displayPrompt?: string
  ) {
    this.activeCallbacks = { onMessage, onStatus, onToolUse, onUsage, onApproval };
    this.messageHistory.push({ role: 'user', content: prompt });
    if (!this.isSubAgent) onMessage('user', displayPrompt || prompt);

    let isFinished = false;
    let totalInputTokens = 0; let totalOutputTokens = 0;
    while (!isFinished) {
      onStatus(`${this.model} is thinking...`);
      let currentAssistantText = '';
      const anthropicTools = [...getAnthropicTools(), ...this.extraTools.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema }))];
      const openAiTools = [...getOpenAITools(), ...this.extraTools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } }))];
      
      try {
        if (this.provider !== 'anthropic' && this.provider !== 'kilocode') {
          const messages = [{ role: 'system', content: this.getSystemPrompt() }, ...this.messageHistory];
          const filteredMessages = messages.map(m => {
              if (m.role === 'tool') return { ...m, role: 'tool' };
              return m;
          });

          const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST', headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({ model: this.model, messages: filteredMessages, tools: openAiTools, stream: true })
          });
          
          if (!response.ok) throw new Error(`API Error (${this.provider}): ${await response.text()}`);
          const reader = response.body?.getReader();
          if (!reader) throw new Error('Streaming not supported');
          let toolCalls: any[] = [];
          
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            const chunks = new TextDecoder().decode(value).split('\n');
            for (const chunk of chunks) {
              const line = chunk.trim();
              if (!line || line === 'data: [DONE]') continue;
              try {
                const json = JSON.parse(line.replace('data: ', ''));
                const delta = json.choices[0].delta;
                if (delta.content) { currentAssistantText += delta.content; onMessage('assistant', currentAssistantText, true); }
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: tc.id, function: { name: '', arguments: '' } };
                    if (tc.function.name) toolCalls[tc.index].function.name += tc.function.name;
                    if (tc.function.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                  }
                }
              } catch (e) {}
            }
          }
          if (toolCalls.length > 0) {
            this.messageHistory.push({ role: 'assistant', content: currentAssistantText || null, tool_calls: toolCalls });
            for (const tc of toolCalls) {
              const tool = tools.find(t => t.name === tc.function.name) || this.extraTools.find(t => t.name === tc.function.name);
              if (tool) {
                const args = JSON.parse(tc.function.arguments); onToolUse(tool.name, args);
                let allowed = true;
                if (SENSITIVE_TOOLS.includes(tool.name)) { onStatus(`WAITING FOR APPROVAL: ${tool.name}`); allowed = await onApproval(tool.name, args); }
                if (allowed) {
                  const output = await tool.execute(args);
                  this.messageHistory.push({ role: 'tool', tool_call_id: tc.id, name: tool.name, content: output });
                } else { this.messageHistory.push({ role: 'tool', tool_call_id: tc.id, name: tool.name, content: "Action denied by user." }); }
              }
            }
          } else { if (currentAssistantText) this.messageHistory.push({ role: 'assistant', content: currentAssistantText }); isFinished = true; }
        } else {
          // Pure Anthropic / Kilocode Legacy Path
          const stream = this.anthropic!.messages.stream({ model: this.model, system: SYSTEM_PROMPT, max_tokens: 4096, messages: this.messageHistory, tools: anthropicTools as any, });
          stream.on('text', (text) => { currentAssistantText += text; onMessage('assistant', currentAssistantText, true); });
          const finalResponse = await stream.finalMessage();
          if (finalResponse.usage) { totalInputTokens += finalResponse.usage.input_tokens; totalOutputTokens += finalResponse.usage.output_tokens; onUsage(totalInputTokens, totalOutputTokens); }
          this.messageHistory.push({ role: 'assistant', content: finalResponse.content });
          let hasToolUse = false;
          for (const content of finalResponse.content) {
            if (content.type === 'tool_use') {
              hasToolUse = true;
              const tool = tools.find(t => t.name === content.name) || this.extraTools.find(t => t.name === content.name);
              if (tool) {
                onToolUse(content.name, content.input);
                let allowed = true;
                if (SENSITIVE_TOOLS.includes(tool.name)) { onStatus(`WAITING FOR APPROVAL: ${tool.name}`); allowed = await onApproval(tool.name, content.input); }
                if (allowed) {
                    const output = await tool.execute(content.input);
                    this.messageHistory.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: content.id, content: output }] });
                } else { this.messageHistory.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: content.id, content: "Action denied by user." }] }); }
              }
            }
          }
          if (!hasToolUse) isFinished = true;
        }
        if (isFinished) { 
          onStatus('Task Complete'); 
          await this.saveHistory(); 
          // Log usage!
          await logUsage({
              date: new Date().toISOString(),
              model: this.model,
              provider: this.provider,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              durationMs: 0 // Track actual duration if possible
          });
        }
      } catch (error: any) { onMessage('assistant', `❌ **API Error:** ${error.message}`); isFinished = true; }
    }
  }
}
