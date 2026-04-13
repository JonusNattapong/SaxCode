import { z } from 'zod';
import { execSync } from 'child_process';
import { ToolDefinition } from './fsTools.ts';

export const gitTools: ToolDefinition[] = [
  {
    name: 'git_status',
    description: 'Check the current status of the git repository (modifications, untracked files).',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        return execSync('git status --short').toString() || 'Everything is clean!';
      } catch (e: any) { return `Git Error: ${e.message}`; }
    }
  },
  {
    name: 'git_diff',
    description: 'Show code changes in the repository.',
    inputSchema: z.object({
      staged: z.boolean().optional().describe('Show staged changes if true'),
    }),
    execute: async ({ staged }) => {
      try {
        const cmd = staged ? 'git diff --cached' : 'git diff';
        return execSync(cmd).toString() || 'No changes to show.';
      } catch (e: any) { return `Git Error: ${e.message}`; }
    }
  },
  {
    name: 'git_commit',
    description: 'Commit changes to the repository.',
    inputSchema: z.object({
      message: z.string().describe('The commit message'),
    }),
    execute: async ({ message }) => {
      try {
        execSync('git add .');
        execSync(`git commit -m "${message}"`);
        return `✅ Committed successfully with message: "${message}"`;
      } catch (e: any) { return `Git Error: ${e.message}`; }
    }
  },
  {
    name: 'git_log',
    description: 'Show recent commit history.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Number of commits (default 5)'),
    }),
    execute: async ({ limit = 5 }) => {
      try {
        return execSync(`git log -n ${limit} --oneline`).toString();
      } catch (e: any) { return `Git Error: ${e.message}`; }
    }
  }
];
