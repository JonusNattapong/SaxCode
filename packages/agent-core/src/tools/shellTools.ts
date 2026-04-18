import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Basic FS Tools
export const readFile = async (filePath: string) => {
    try { return await fs.readFile(filePath, 'utf-8'); }
    catch (e: any) { return `Error reading file: ${e.message}`; }
};

export const writeFile = async (filePath: string, content: string) => {
    try { 
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content); 
        return `✅ Successfully wrote to ${filePath}`;
    } catch (e: any) { return `Error writing file: ${e.message}`; }
};

export const listDir = async (dirPath: string) => {
    try {
        const files = await fs.readdir(dirPath || '.', { withFileTypes: true });
        return files.map(f => `${f.isDirectory() ? '📁' : '📄'} ${f.name}`).join('\n');
    } catch (e: any) { return `Error listing directory: ${e.message}`; }
};

// Advanced Shell Tools
export const runCommand = async (command: string, input?: string) => {
    try {
        const platform = os.platform();
        let cmdArgs: string[];
        if (platform === 'win32') { cmdArgs = ['powershell', '-Command', command]; }
        else { cmdArgs = ['sh', '-c', command]; }

        const proc = Bun.spawn(cmdArgs, { stdin: input ? 'pipe' : 'inherit', stdout: 'pipe', stderr: 'pipe' });
        if (input && proc.stdin) {
            const writer = proc.stdin.getWriter();
            writer.write(new TextEncoder().encode(input));
            writer.close();
        }

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        let result = `> ${command} (Exit Code: ${exitCode})\n\n`;
        if (stdout) result += `STDOUT:\n${stdout}\n`;
        if (stderr) result += `STDERR:\n${stderr}\n`;
        return result || 'Command executed with no output.';
    } catch (err: any) { return `Execution Failed: ${err.message}`; }
};

export const grepSearch = async (dirPath: string, pattern: string) => {
    try {
        const targetDir = dirPath || '.';
        const maxResults = 30;
        let matchCount = 0;
        const results: string[] = [];
        
        async function searchDir(currentPath: string) {
            if (matchCount >= maxResults) return;
            const entries = await fs.readdir(currentPath, { withFileTypes: true }).catch(() => []);
            for (const entry of entries) {
                if (matchCount >= maxResults) break;
                // Hard skip heavy directories
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build' || entry.name === '.next') continue;
                
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    await searchDir(fullPath);
                } else if (entry.isFile()) {
                    // Skip binaries and media
                    const ext = path.extname(entry.name).toLowerCase();
                    if (['.exe', '.dll', '.png', '.jpg', '.jpeg', '.gif', '.mp4', '.webp', '.zip', '.tar', '.gz', '.pdf', '.woff2'].includes(ext)) continue;
                    
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const lines = content.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].includes(pattern)) {
                                results.push(`${fullPath}:${i + 1}:${lines[i].trim()}`);
                                matchCount++;
                                if (matchCount >= maxResults) break;
                            }
                        }
                    } catch (e) { /* ignore unreadable files */ }
                }
            }
        }
        
        await searchDir(targetDir);
        return results.length > 0 ? results.join('\n') : `No matches found for "${pattern}".`;
    } catch (e: any) {
        return `Search Error: ${e.message}`;
    }
};

export const replaceFileContent = async (filePath: string, target: string, replacement: string) => {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (!content.includes(target)) return `❌ Target content not found in ${filePath}`;
        const newContent = content.replace(target, replacement);
        await fs.writeFile(filePath, newContent);
        return `✅ Successfully replaced content in ${filePath}`;
    } catch (e: any) { return `Error: ${e.message}`; }
};

export const multiReplaceFileContent = async (filePath: string, replacements: {target: string, replacement: string}[]) => {
    try {
        let content = await fs.readFile(filePath, 'utf-8');
        for (const r of replacements) {
            if (content.includes(r.target)) { content = content.replace(r.target, r.replacement); }
        }
        await fs.writeFile(filePath, content);
        return `✅ Multi-replacement complete for ${filePath}`;
    } catch (e: any) { return `Error: ${e.message}`; }
};
