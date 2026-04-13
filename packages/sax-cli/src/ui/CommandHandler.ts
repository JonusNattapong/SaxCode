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

export const handleSlashCommand = async (input: string, ctx: CommandContext): Promise<boolean> => {
    const parts = input.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];
    const { agent, setIsAutoApprove, isAutoApprove, setCurrentProvider, setCurrentModel, setMessages, exit, onSessionReady, setShowStats, setActiveMenu } = ctx;

    if (!agent) return false;

    switch (cmd) {
        case '/auto':
            setIsAutoApprove(!isAutoApprove);
            setMessages((prev: any) => [...prev, { role: 'assistant', content: `🛡️ Autonomous Mode: **${!isAutoApprove ? 'ENABLED' : 'DISABLED'}**` }]);
            return true;

        case '/provider':
            if (arg) {
                agent.updateProvider(arg as ProviderType);
                setCurrentProvider(arg as ProviderType);
                await saveConfig({ SAX_PROVIDER: arg });
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `🔄 Provider switched to **${arg.toUpperCase()}**` }]);
            } else {
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `💡 Usage: **/provider <name>** (e.g., anthropic, ollama, kilocode)` }]);
            }
            return true;

        case '/model':
            if (arg) {
                agent.updateModel(arg);
                setCurrentModel(arg);
                await saveConfig({ ANTHROPIC_MODEL: arg });
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `🔄 Model switched to **${arg}**` }]);
            } else {
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `💡 Usage: **/model <name>**` }]);
            }
            return true;

        case '/style':
            if (arg) {
                const style = arg as OutputStyle;
                agent.setOutputStyle(style);
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `🎨 Output Style switched to **${style}**` }]);
            } else {
                setMessages((prev: any) => [...prev, { role: 'assistant', content: `💡 Usage: **/style <default|Explanatory|Learning>**` }]);
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
            setMessages((prev: any) => [...prev, { role: 'assistant', content: `🆕 New session started: **${agent.getSessionId().slice(-8)}**` }]);
            return true;

        case '/exit':
            exit();
            return true;
            
        case '/sessions':
            const sessions = await agent.listSessions();
            setMessages((prev: any) => [...prev, { role: 'assistant', content: `📂 **Recent Sessions:**\n${sessions.map(id => `- ${id}`).join('\n')}` }]);
            return true;

        case '/stats':
            ctx.setShowStats(true);
            return true;

        default:
            return false; // Not a command we handle here
    }
};
