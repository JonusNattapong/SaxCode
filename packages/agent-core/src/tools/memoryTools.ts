import { z } from 'zod';
import { ToolDefinition } from './fsTools.ts';
import fs from 'fs/promises';
import path from 'path';

const MEMORY_DIR = '.saxcode_memory';
const KNOWLEDGE_FILE = path.join(MEMORY_DIR, 'knowledge_base.md');

export const memoryTools: ToolDefinition[] = [
  {
    name: 'save_memory',
    description: 'Save important knowledge, decisions, or project details to the long-term memory.',
    inputSchema: z.object({
      topic: z.string().describe('The topic of the knowledge (e.g., "Architecture", "Database")'),
      content: z.string().describe('The detailed information to remember'),
    }),
    execute: async ({ topic, content }) => {
      try {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        const timestamp = new Date().toISOString();
        const entry = `\n## [${timestamp}] ${topic}\n${content}\n\n---\n`;
        
        await fs.appendFile(KNOWLEDGE_FILE, entry, 'utf-8');
        return `✅ Knowledge about "${topic}" has been saved to long-term memory.`;
      } catch (err: any) {
        return `Memory Error: ${err.message}`;
      }
    }
  },
  {
    name: 'recall_memory',
    description: 'Recall long-term memories and project-specific knowledge.',
    inputSchema: z.object({
      query: z.string().optional().describe('Search term (optional)'),
    }),
    execute: async ({ query }) => {
      try {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        let content = '';
        try {
          content = await fs.readFile(KNOWLEDGE_FILE, 'utf-8');
        } catch (e) {
          return "Memory is currently empty.";
        }

        if (query) {
          // In 2026, we return more context so the LLM can see the full sections
          return `--- Long-term Memory Search for "${query}" ---\n\n${content}`;
        }

        return `--- Full Long-term Memory ---\n\n${content}`;
      } catch (err: any) {
        return `Recall Error: ${err.message}`;
      }
    }
  }
];
