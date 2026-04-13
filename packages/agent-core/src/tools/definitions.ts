import { 
  readFile, 
  writeFile, 
  listDir, 
  runCommand, 
  grepSearch,
  replaceFileContent,
  multiReplaceFileContent
} from './shellTools.ts';
import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';

export const tools = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from the local filesystem.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'The absolute or relative path to the file.' } },
      required: ['path']
    },
    execute: (args: { path: string }) => readFile(args.path)
  },
  {
    name: 'write_file',
    description: 'Create a new file or overwrite an existing file with new content.',
    inputSchema: {
      type: 'object',
      properties: { 
        path: { type: 'string', description: 'The path where the file should be created.' },
        content: { type: 'string', description: 'The content to write to the file.' }
      },
      required: ['path', 'content']
    },
    execute: (args: { path: string, content: string }) => writeFile(args.path, args.content)
  },
  {
    name: 'list_dir',
    description: 'List the contents of a directory.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'The path to the directory.' } },
      required: ['path']
    },
    execute: (args: { path: string }) => listDir(args.path)
  },
  {
    name: 'run_command',
    description: 'Execute a terminal command. Use this for git, npm, etc.',
    inputSchema: {
      type: 'object',
      properties: { command: { type: 'string', description: 'The command to run.' } },
      required: ['command']
    },
    execute: (args: { command: string }) => runCommand(args.command)
  },
  {
    name: 'grep_search',
    description: 'Search for a string pattern in files.',
    inputSchema: {
      type: 'object',
      properties: { 
        path: { type: 'string' },
        pattern: { type: 'string' }
      },
      required: ['path', 'pattern']
    },
    execute: (args: { path: string, pattern: string }) => grepSearch(args.path, args.pattern)
  },
  {
    name: 'replace_file_content',
    description: 'Replace a specific block of content in a file.',
    inputSchema: {
      type: 'object',
      properties: { 
        path: { type: 'string' },
        targetContent: { type: 'string' },
        replacementContent: { type: 'string' }
      },
      required: ['path', 'targetContent', 'replacementContent']
    },
    execute: (args: any) => replaceFileContent(args.path, args.targetContent, args.replacementContent)
  },
  
  // NEW TOOLS
  {
    name: 'web_search',
    description: 'Search the web for real-time information using Tavily API.',
    inputSchema: {
      type: 'object',
      properties: { 
        query: { type: 'string', description: 'The search query.' }
      },
      required: ['query']
    },
    execute: async (args: { query: string }) => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return "Error: TAVILY_API_KEY not found in environment.";
      try {
        const resp = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, query: args.query, search_depth: "advanced" })
        });
        const data = await resp.json();
        return JSON.stringify(data, null, 2);
      } catch (e: any) { return `Search Error: ${e.message}`; }
    }
  },
  {
    name: 'save_knowledge',
    description: 'Save important project information to the long-term memory (knowledge_base.md).',
    inputSchema: {
      type: 'object',
      properties: { 
        topic: { type: 'string', description: 'The topic or title of the knowledge.' },
        content: { type: 'string', description: 'Detailed information to remember.' }
      },
      required: ['topic', 'content']
    },
    execute: async (args: { topic: string, content: string }) => {
      const MEMORY_DIR = '.saxcode_memory';
      const MEMORY_FILE = path.join(MEMORY_DIR, 'knowledge_base.md');
      try {
        await fs.mkdir(MEMORY_DIR, { recursive: true });
        const entry = `\n\n## ${args.topic} (Saved: ${new Date().toLocaleString()})\n${args.content}\n`;
        await fs.appendFile(MEMORY_FILE, entry);
        return `✅ Knowledge about "${args.topic}" has been saved to long-term memory.`;
      } catch (e: any) { return `Error saving knowledge: ${e.message}`; }
    }
  },
  {
    name: 'show_image',
    description: 'Open an image file with the default system viewer.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'The path to the image file.' } },
      required: ['path']
    },
    execute: async (args: { path: string }) => {
      try {
        const cmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
        await execa(cmd, [args.path]);
        return `✅ Opening image: ${args.path}`;
      } catch (e: any) { return `Error opening image: ${e.message}`; }
    }
  }
];

export const getAnthropicTools = () => {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema
  }));
};

export const getOpenAITools = () => {
    return tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema
      }
    }));
};
