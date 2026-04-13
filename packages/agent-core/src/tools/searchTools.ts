import { z } from 'zod';
import { ToolDefinition } from './fsTools.ts';

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
  }
];
