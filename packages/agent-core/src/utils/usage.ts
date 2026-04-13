import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const USAGE_FILE = path.join(os.homedir(), '.saxcode', 'usage.json');

export interface UsageRecord {
  date: string; // ISO String
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  totalTokens: number;
  messageCount: number;
  models: Record<string, number>;
}

export async function logUsage(record: UsageRecord) {
  try {
    const dir = path.dirname(USAGE_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    let history: UsageRecord[] = [];
    try {
      const data = await fs.readFile(USAGE_FILE, 'utf-8');
      history = JSON.parse(data);
    } catch (e) {}
    
    history.push(record);
    await fs.writeFile(USAGE_FILE, JSON.stringify(history, null, 2));
  } catch (e) {}
}

export async function getUsageHistory(): Promise<UsageRecord[]> {
  try {
    const data = await fs.readFile(USAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) { return []; }
}

export function aggregateDaily(history: UsageRecord[]): DailyActivity[] {
    const map = new Map<string, DailyActivity>();
    
    history.forEach(h => {
        const date = h.date.split('T')[0];
        const existing = map.get(date) || { date, totalTokens: 0, messageCount: 0, models: {} };
        
        existing.totalTokens += (h.inputTokens + h.outputTokens);
        existing.messageCount += 1;
        existing.models[h.model] = (existing.models[h.model] || 0) + (h.inputTokens + h.outputTokens);
        
        map.set(date, existing);
    });
    
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateStreaks(daily: DailyActivity[]) {
    if (daily.length === 0) return { current: 0, longest: 0 };
    
    let longest = 0;
    let current = 0;
    let tempStreak = 0;
    
    const dates = daily.map(d => d.date);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Sort dates just in case
    dates.sort();
    
    for (let i = 0; i < dates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prev = new Date(dates[i-1]);
            const curr = new Date(dates[i]);
            const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
            
            if (diff === 1) {
                tempStreak++;
            } else {
                longest = Math.max(longest, tempStreak);
                tempStreak = 1;
            }
        }
    }
    longest = Math.max(longest, tempStreak);
    
    // Check if current streak is still active (today or yesterday)
    const lastDate = dates[dates.length - 1];
    if (lastDate === today || lastDate === yesterday) {
        current = tempStreak;
    } else {
        current = 0;
    }
    
    return { current, longest };
}
