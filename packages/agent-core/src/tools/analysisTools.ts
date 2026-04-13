import { z } from 'zod';
import { ToolDefinition } from './fsTools.ts';
import fs from 'fs/promises';
import path from 'path';

export const analysisTools: ToolDefinition[] = [
  {
    name: 'analyze_project',
    description: 'Provide an overview of the project structure and main entry points.',
    inputSchema: z.object({
      path: z.string().describe('The root directory to analyze (default: ".")'),
    }),
    execute: async ({ path: dirPath = '.' }) => {
      try {
        const getAllFiles = async (dir: string): Promise<string[]> => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const files = await Promise.all(entries.map((res) => {
            const resPath = path.resolve(dir, res.name);
            const relativePath = path.relative(dirPath, resPath);
            if (res.isDirectory()) {
                if (res.name === 'node_modules' || res.name === '.git') return [];
                return getAllFiles(resPath);
            }
            return (res.name.match(/\.(ts|tsx|js|jsx)$/)) ? [relativePath] : [];
          }));
          return files.flat();
        };

        const files = await getAllFiles(dirPath);
        let report = `Project Analysis for ${dirPath}:\n`;
        report += `Total code files: ${files.length}\n\n`;
        const sortedDirs = [...new Set(files.map(f => path.dirname(f)))].sort();
        for (const dir of sortedDirs) {
            const dirFiles = files.filter(f => path.dirname(f) === dir);
            report += `📁 ${dir === '.' ? 'root' : dir}/\n`;
            for (const f of dirFiles) {
                report += `  📄 ${path.basename(f)}\n`;
            }
        }
        return report;
      } catch (err: any) { return `Analysis Error: ${err.message}`; }
    }
  }
];
