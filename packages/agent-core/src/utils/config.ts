import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.saxcode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config');

export interface SaxConfig {
  SAX_PROVIDER?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  TAVILY_API_KEY?: string;
  [key: string]: string | undefined;
}

export async function loadConfig(): Promise<SaxConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config: SaxConfig = {};
    data.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) config[key.trim()] = value.trim();
    });
    return config;
  } catch (e) { return {}; }
}

export async function saveConfig(updates: Partial<SaxConfig>) {
  try {
    const currentConfig = await loadConfig();
    const newConfig = { ...currentConfig, ...updates };
    
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    const content = Object.entries(newConfig)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    
    await fs.writeFile(CONFIG_FILE, content);
    
    // Also update process.env so it works immediately
    for (const [k, v] of Object.entries(updates)) {
        if (v) process.env[k] = v;
    }
    
    return true;
  } catch (e) { return false; }
}
