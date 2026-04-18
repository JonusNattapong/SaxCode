import { z } from 'zod';
import { ToolDefinition } from './fsTools.ts';
import { execa } from 'execa';
import path from 'path';

export const searchTools: ToolDefinition[] = [
  {
    name: 'tavily_search',
    description: 'Search the web using Tavily AI Search for high-quality, LLM-optimized results and summaries.',
    inputSchema: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return 'Error: TAVILY_API_KEY is missing.';
      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, query, search_depth: 'advanced', include_answer: true, max_results: 5 })
        });
        const data: any = await response.json();
        let report = `AI Summary: ${data.answer || 'No direct answer found.'}\n\nTop Results:\n`;
        data.results?.forEach((r: any, i: number) => { report += `${i+1}. [${r.title}](${r.url})\n   ${r.content}\n\n`; });
        return report;
      } catch (err: any) { return `Tavily Error: ${err.message}`; }
    }
  },
  {
    name: 'brave_search',
    description: 'Search the web using Brave Search for raw web results and diversity.',
    inputSchema: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
      const apiKey = process.env.BRAVE_SEARCH_API_KEY;
      if (!apiKey) return 'Error: BRAVE_SEARCH_API_KEY is missing.';
      try {
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey }
        });
        const data: any = await response.json();
        return data.web?.results?.map((r: any) => `- **${r.title}**: ${r.description} (${r.url})`).join('\n') || 'No results.';
      } catch (err: any) { return `Brave Search Error: ${err.message}`; }
    }
  },
  {
    name: 'duckduckgo_search',
    description: 'A free, no-key fallback search engine (DuckDuckGo Lite) for when API quotas are reached.',
    inputSchema: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
      try {
        const response = await fetch(`https://duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const html = await response.text();
        const results: string[] = [];
        const regex = /result-link.*?href=["'](.*?)["']>(.*?)<\/a>.*?result-snippet["']>(.*?)<\/td>/gs;
        let match; let count = 0;
        while ((match = regex.exec(html)) !== null && count < 5) {
          let [_, rawUrl, title, snippet] = match;
          let url = rawUrl;
          if (rawUrl.includes('uddg=')) {
            const matchUrl = rawUrl.match(/uddg=(.*?)(&|$)/);
            if (matchUrl) url = decodeURIComponent(matchUrl[1]);
          }
          if (url.startsWith('//')) url = 'https:' + url;
          results.push(`${count+1}. **${title.trim()}**\n   ${snippet.trim()}\n   Link: ${url}`);
          count++;
        }
        return results.join('\n\n') || "No results found. DDG Lite structure changed or blocked.";
      } catch (err: any) { return `DuckDuckGo Error: ${err.message}`; }
    }
  },
  {
    name: 'read_web_page',
    description: 'Converts any web page URL into clean Markdown. It uses a local stealth scraper (Scrapling) first to save cost and bypass bots, falling back to Jina API if needed.',
    inputSchema: z.object({
      url: z.string().describe('The full URL of the web page to read'),
    }),
    execute: async ({ url }) => {
      try {
        // Attempt 1: Stealth Local Scraper via Python (Cost: $0)
        try {
           const scriptPath = path.resolve('packages/agent-core/src/python-scripts/scraper.py');
           const { stdout } = await execa('python', [scriptPath, url], { timeout: 15000 });
           
           if (stdout && !stdout.includes('ERROR:')) {
               let md = stdout;
               if (md.length > 30000) return md.slice(0, 30000) + '\n\n...(Content truncated for brevity)';
               return md;
           }
        } catch (pyErr) {
           console.log(`[Research] Local scrape failed, falling back to Jina API...`);
        }

        // Attempt 2: Fallback to Jina Reader API
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: { 'Accept': 'text/event-stream' }
        });
        const md = await response.text();
        if (md.length > 30000) return md.slice(0, 30000) + '\n\n...(Content truncated for brevity)';
        return md;
      } catch (err: any) { return `Reader Error: ${err.message}`; }
    }
  }
];
