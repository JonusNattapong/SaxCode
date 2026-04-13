import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  execute: (args: any) => Promise<string>;
}

export const fsTools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file.',
    inputSchema: z.object({
      path: z.string().describe('The path to the file to read'),
    }),
    execute: async ({ path: filePath }) => {
      try {
        return await fs.readFile(filePath, 'utf-8');
      } catch (err: any) {
        return `Error reading file: ${err.message}`;
      }
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file.',
    inputSchema: z.object({
      path: z.string().describe('The path to the file to write'),
      content: z.string().describe('The content to write'),
    }),
    execute: async ({ path: filePath, content }) => {
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        return `Successfully wrote to ${filePath}`;
      } catch (err: any) {
        return `Error writing file: ${err.message}`;
      }
    }
  },
  {
    name: 'list_dir',
    description: 'List the contents of a directory.',
    inputSchema: z.object({
      path: z.string().describe('The path to the directory to list'),
    }),
    execute: async ({ path: dirPath }) => {
      try {
        const files = await fs.readdir(dirPath);
        return files.join('\n');
      } catch (err: any) {
        return `Error listing directory: ${err.message}`;
      }
    }
  }
];
