import { SaxAgent, ProviderType, saveConfig, OutputStyle } from '@sax/agent-core';

export interface CommandContext {
  agent: SaxAgent | null;
  setIsAutoApprove: (val: boolean | ((p: boolean) => boolean)) => void;
  isAutoApprove: boolean;
  setCurrentProvider: (p: ProviderType) => void;
  setCurrentModel: (m: string) => void;
  setMessages: (m: any) => void;
  setShowStats: (val: boolean) => void;
  exit: () => void;
  onSessionReady?: (id: string) => void;
  setActiveMenu?: (menu: any) => void;
}

export const handleSlashCommand = async (input: string, ctx: CommandContext): Promise<boolean | string> => {
    const parts = input.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];
    const { agent, setIsAutoApprove, isAutoApprove, setCurrentProvider, setCurrentModel, setMessages, exit, onSessionReady, setShowStats, setActiveMenu } = ctx;

    if (!agent) return false;

    switch (cmd) {
        case '/auto':
            setIsAutoApprove(!isAutoApprove);
            setMessages((prev: any) => [...prev, { role: 'assistant', content: `[Mode] Autonomous: **${!isAutoApprove ? 'ENABLED' : 'DISABLED'}**` }]);
            return true;

        case '/provider':
            if (arg) {
                agent.updateProvider(arg as ProviderType);
                setCurrentProvider(arg as ProviderType);
                await saveConfig({ SAX_PROVIDER: arg });
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `Provider switched to **${arg.toUpperCase()}**` }]);
            } else {
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `💡 Usage: **/provider <name>** (e.g., anthropic, ollama, kilocode)` }]);
            }
            return true;

        case '/model':
            if (arg) {
                agent.updateModel(arg);
                setCurrentModel(arg);
                await saveConfig({ ANTHROPIC_MODEL: arg });
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `Model switched to **${arg}**` }]);
            } else {
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `💡 Usage: **/model <name>**` }]);
            }
            return true;

        case '/style':
            if (arg) {
                const style = arg as OutputStyle;
                agent.setOutputStyle(style);
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `Output Style switched to **${style}**` }]);
            } else {
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `Usage: **/style <default|Explanatory|Learning>**` }]);
            }
            return true;

        case '/clear':
            agent.startNewSession();
            if (onSessionReady) onSessionReady(agent.getSessionId());
            setMessages([]);
            return true;

        case '/new':
            agent.startNewSession();
            if (onSessionReady) onSessionReady(agent.getSessionId());
            setMessages([]);
            setMessages((prev: any) => [...prev, { role: 'assistant', content: `New session started: **${agent.getSessionId().slice(-8)}**` }]);
            return true;

        case '/exit':
            exit();
            return true;
            
        case '/sessions':
            const sessions = await agent.listSessions();
            setMessages((prev: any) => [...prev, { role: 'assistant', content: `Repository sessions:\n${sessions.map(id => `- ${id}`).join('\n')}` }]);
            return true;

        case '/stats':
            ctx.setShowStats(true);
            return true;

        case '/research':
            if (arg) {
                const topic = parts.slice(1).join(' ');
                const expandedPrompt = `Please perform an Autonomous Deep Research on: "${topic}". 
You must act as an elite 'Perplexity-style' research agent. Follow this strict workflow:
1. EXPLORE: Search for high-quality, up-to-date sources using your search tools (Tavily/Brave). 
2. ITERATE: If the initial results are insufficient or too shallow, run new targeted searches automatically. Do not stop until you have a comprehensive understanding.
3. EXTRACT: Use the 'read_web_page' tool to aggressively scrape full content from the 3-5 most critical URLs.
4. SYNTHESIZE: Write a highly structured, premium Executive Report in Markdown format (use bolding, lists, and clear headings).
5. CITE SOURCES: You MUST use inline citations (e.g., "The speed increased by 50% [1].") mapped to a distinct "References" section at the bottom. The References section must contain the actual, clickable URLs you read.`;
                // Add the clean, original command to the UI
                setMessages((prev: any) => [...prev, { role: 'user', content: expandedPrompt }]);
                return expandedPrompt; // Tell App.tsx to run this prompt!
            } else {
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `Usage: **/research <topic>**` }]);
                return true;
            }

        default:
            return false; // Not a command we handle here
    }
};
