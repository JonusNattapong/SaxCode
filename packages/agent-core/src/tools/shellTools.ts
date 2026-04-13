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
    // Basic glob-like search or just use shell grep
    const cmd = process.platform === 'win32' ? `ls -r | sls "${pattern}"` : `grep -rn "${pattern}" "${dirPath}"`;
    return runCommand(cmd);
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
