import * as React from 'react';
import { useState, useEffect } from 'react';
import { render, Text, Box, Newline, useInput, useApp } from 'ink';
import chalk from 'chalk';
import { ClaudeSpinner } from './ClaudeSpinner.tsx';
import { SaxSelect, type SaxOption } from './SaxSelect.tsx';
import { SwarmTracker, type SwarmTask } from './SwarmTracker.tsx';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { SaxAgent, type ProviderType, McpClient, calculateCost, saveConfig, loadConfig } from '@sax/agent-core';
import { handleSlashCommand } from './CommandHandler.ts';
import { StatsView } from './StatsView.tsx'; // NEW!
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CLAUDE_ORANGE = '#da7756';

marked.setOptions({
  renderer: new TerminalRenderer({
    width: process.stdout.columns ? process.stdout.columns - 4 : 80,
    tab: 2,
    reflowText: true,
  })
});

interface AppProps {
  initialPrompt: string;
  resumeId?: string;
  onSessionReady?: (id: string) => void;
}

const Banner = () => (
  <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
    <Text color={CLAUDE_ORANGE} bold>
      {`
  ██████╗  █████╗ ██╗  ██╗ ██████╗ ██████╗ ██████╗ ███████╗
 ██╔════╝ ██╔══██╗╚██╗██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
 ╚█████╗  ███████║ ╚███╔╝ ██║     ██║   ██║██║  ██║█████╗  
  ╚═══██╗ ██╔══██║ ██╔██╗ ██║     ██║   ██║██║  ██║██╔══╝  
 ██████╔╝ ██║  ██║██╔╝ ██╗╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═════╝  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
      `}
    </Text>
    <Box flexDirection="column" marginLeft={2}>
        <Text color="gray">  -------------------------------------------------------</Text>
        <Text>  <Text bold>SaxCode</Text> v1.0.0 - <Text italic>Your dynamic agentic coding partner</Text></Text>
        <Text color="gray">  -------------------------------------------------------</Text>
    </Box>
  </Box>
);

export const App: React.FC<AppProps> = ({ initialPrompt, resumeId, onSessionReady }) => {
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [status, setStatus] = useState('Idle');
  const [toolCall, setToolCall] = useState<{ name: string, args: any } | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [currentVerb, setCurrentVerb] = useState('Thinking');
  const [tokens, setTokens] = useState({ input: 0, output: 0 });
  const [sessionCost, setSessionCost] = useState(0);
  const [isAutoApprove, setIsAutoApprove] = useState(false);
  const [showStats, setShowStats] = useState(false); // NEW!
  const [approvalRequest, setApprovalRequest] = useState<{ name: string, args: any, resolve: (val: boolean) => void } | null>(null);
  const [activeMenu, setActiveMenu] = useState<{ badge: string, question: string, options: SaxOption[] } | null>(null);
  const [swarmTasks, setSwarmTasks] = useState<SwarmTask[]>([]);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [currentReceivedTokens, setCurrentReceivedTokens] = useState(0);
  
  const [suggestions, setSuggestions] = useState<{ name: string, desc: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { exit } = useApp();
  const [agent, setAgent] = useState<SaxAgent | null>(null);
  const [currentProvider, setCurrentProvider] = useState<ProviderType>('anthropic');
  const [currentModel, setCurrentModel] = useState('claude-3-5-sonnet-latest');

  useEffect(() => {
    (async () => {
        const config = await loadConfig();
        const provider = (config.SAX_PROVIDER || 'anthropic') as any;
        const key = config.ANTHROPIC_API_KEY || '';
        const model = config.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
        const baseURL = config.ANTHROPIC_BASE_URL;

        const newAgent = new SaxAgent(provider, key, model, baseURL);
        
        if (resumeId) {
            const history = await newAgent.resumeSession(resumeId);
            if (history) setMessages(mapHistoryToUI(history));
        } else {
            const sessions = await newAgent.listSessions();
            if (sessions.length > 0) {
                const latest = sessions.sort().reverse()[0];
                const history = await newAgent.resumeSession(latest);
                if (history) setMessages(mapHistoryToUI(history));
            }
        }

        if (onSessionReady) onSessionReady(newAgent.getSessionId());
        setAgent(newAgent);
        setCurrentProvider(newAgent.getProvider());
        setCurrentModel(newAgent.getModel());
        
        if (initialPrompt) handleSubmit(initialPrompt, newAgent);
    })();
  }, []);

  useEffect(() => {
    const cost = calculateCost(currentModel, tokens.input, tokens.output);
    setSessionCost(cost);
  }, [tokens]);

  // Handle Autocomplete Suggestions
  const COMMAND_DESCRIPTIONS: Record<string, string> = {
    '/clear': 'Clear the current conversation and start fresh',
    '/exit': 'Close the application',
    '/sessions': 'Display a list of available session history',
    '/new': 'Initialize a completely new session ID',
    '/model': 'Switch to a different AI model (e.g. claude-3-5-sonnet)',
    '/provider': 'Switch LLM provider (anthropic, kilocode, ollama, etc.)',
    '/auto': 'Toggle autonomous mode for automatic tool approval',
    '/stats': 'Open the detailed usage statistics dashboard',
    '/style': 'Change response style (Default, Explanatory, Learning)',
    '/research': 'Perform a deep, multi-step web investigation on a topic'
  };

  useEffect(() => {
      if (userInput.includes('@')) {
          const match = userInput.match(/@([a-zA-Z0-9_.\-\/\\]*)$/);
          if (match) {
              const query = match[1].toLowerCase();
              (async () => {
                  try {
                      const files = await fs.readdir('.');
                      const filtered = files.filter(f => f.toLowerCase().startsWith(query)).slice(0, 10);
                      setSuggestions(filtered.map(f => ({ name: f, desc: 'File or directory' })));
                      setSelectedIndex(0);
                  } catch (e) { setSuggestions([]); }
              })();
              return;
          }
      }

      const isSlashCommand = userInput.startsWith('/') && !userInput.includes(' ');
      if (userInput.startsWith('/provider ')) {
          const providers = ['anthropic', 'kilocode', 'ollama', 'openai', 'deepseek', 'gemini'];
          const query = userInput.slice(10).toLowerCase();
          setSuggestions(providers.filter(p => p.startsWith(query)).map(p => ({ name: p, desc: `Switch to ${p} provider` })));
          setSelectedIndex(0);
      } else if (userInput.startsWith('/model ')) {
          if (!agent) return;
          const query = userInput.slice(7).toLowerCase();
          agent.getAvailableModels().then(models => {
              setSuggestions(models.filter(m => m.toLowerCase().includes(query)).map(m => ({ name: m, desc: 'Available model' })));
              setSelectedIndex(0);
          });
      } else if (isSlashCommand) {
          const commands = Object.keys(COMMAND_DESCRIPTIONS);
          const query = userInput.toLowerCase();
          setSuggestions(
            commands
              .filter(c => c.startsWith(query))
              .map(c => ({ name: c, desc: COMMAND_DESCRIPTIONS[c] }))
          );
          setSelectedIndex(0);
      } else {
          setSuggestions([]);
      }
  }, [userInput, agent]);

  const mapHistoryToUI = (history: any[]) => {
      return history
        .filter((m: any) => m.role === 'user' || (m.role === 'assistant' && typeof m.content === 'string'))
        .map((m: any) => ({ 
            role: m.role, 
            content: typeof m.content === 'string' ? m.content : 'Complex content...' 
        }));
  };

  const handleSubmit = async (prompt: string, targetAgent?: SaxAgent) => {
    const activeAgent = targetAgent || agent;
    if (!activeAgent || !prompt.trim() || isBusy || approvalRequest) return;

    let processedPrompt = prompt.trim();
    
    // Command Processing
    if (processedPrompt.startsWith('/')) {
        const ctx = { 
            agent: activeAgent, setIsAutoApprove, isAutoApprove, 
            setCurrentProvider, setCurrentModel, setMessages, exit, onSessionReady, setShowStats,
            setActiveMenu
        };
        const wasHandled = await handleSlashCommand(processedPrompt, ctx);
        if (typeof wasHandled === 'string') {
            // It's a macro! Override the prompt with the expanded version and let AI process it.
            processedPrompt = wasHandled;
        } else if (wasHandled === true) {
            setUserInput(''); 
            return; 
        }
    }

    setIsBusy(true); setUserInput('');
    setSuggestions([]);
    setSwarmTasks([{ id: 'init', type: 'think', status: 'running', label: 'Analyzing request...', assignee: 'Agent OS' }]);
    setThinkingTime(0);
    setCurrentReceivedTokens(0);

    const timer = setInterval(() => {
        setThinkingTime(t => t + 1);
    }, 1000);

    const mentions = Array.from(processedPrompt.matchAll(/@([a-zA-Z0-9_.\-\/\\]+)/g));
    let appendedContext = '';
    for (const m of mentions) {
      try { const fileContent = await fs.readFile(m[1], 'utf-8'); appendedContext += `\n\n--- Contents of ${m[1]} ---\n${fileContent}\n`; } catch (err) {}
    }
    if (appendedContext) processedPrompt += "\n" + appendedContext;

    try {
      let isFirstChunk = true;
      await activeAgent.run(processedPrompt,
        (role, content, isStreaming) => {
          if (isStreaming) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && !isFirstChunk) {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'assistant', content };
                return newMessages;
              } else {
                isFirstChunk = false;
                return [...prev, { role: 'assistant', content }];
              }
            });
          } else { setMessages(prev => [...prev, { role, content }]); }
        },
        (s) => {
            setStatus(s);
            setSwarmTasks(prev => {
                const arr = [...prev];
                const last = arr[arr.length - 1];
                if (last && last.type === 'think' && last.status === 'running') last.label = s;
                return arr;
            });
        },
        (n, a) => {
            setToolCall({ name: n, args: a });
            setSwarmTasks(prev => {
                const newTasks = prev.map(t => t.status === 'running' ? { ...t, status: 'completed' as const } : t);
                newTasks.push({
                    id: Math.random().toString(),
                    type: 'tool',
                    status: 'running',
                    label: `Execute Tool: ${n}`,
                    description: `Preparing arguments...`,
                    assignee: 'Tool Node'
                });
                return newTasks;
            });
        },
        (inT, outT) => {
            setTokens(prev => ({ input: prev.input + inT, output: prev.output + outT }));
            setCurrentReceivedTokens(prev => prev + outT);
        },
        (name, args) => { 
            return new Promise((resolve) => { 
                if (isAutoApprove) { resolve(true); return; }
                setApprovalRequest({ name, args, resolve }); 
            }); 
        }
      );
    } catch (e: any) { 
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${e.message}` }]); 
    } finally { 
        setIsBusy(false); setToolCall(null); setStatus('Idle'); 
        clearInterval(timer);
        setSwarmTasks(prev => prev.map(t => ({ ...t, status: 'completed' as const })));
        setTimeout(() => setSwarmTasks([]), 2000);
    }
  };

  useEffect(() => {
    const verbs = ['Thinking', 'Whirring', 'Calculating', 'Processing', 'Architecting', 'Baking', 'Brewing', 'Clauding', 'Combobulating', 'Thinking', 'Whirring'];
    if (isBusy) {
        setCurrentVerb(verbs[Math.floor(Math.random() * verbs.length)]);
    }
  }, [isBusy]);

  useInput((input, key) => {
    if (showStats || activeMenu) return; // Ignore input when stats or menu are open

    if (key.escape || (key.ctrl && input === 'c')) exit();
    if (approvalRequest) {
        if (input.toLowerCase() === 'y') { approvalRequest.resolve(true); setApprovalRequest(null); }
        else if (input.toLowerCase() === 'n') { approvalRequest.resolve(false); setApprovalRequest(null); }
        return;
    }

    if (suggestions.length > 0) {
        if (key.downArrow) { setSelectedIndex(i => (i + 1) % suggestions.length); return; }
        if (key.upArrow) { setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length); return; }
        if (key.return) {
            if (userInput.includes('@')) {
                const match = userInput.match(/^(.*)@([a-zA-Z0-9_.\-\/\\]*)$/);
                if (match) { setUserInput(match[1] + '@' + suggestions[selectedIndex].name); setSuggestions([]); return; }
            } else if (userInput.startsWith('/provider ')) {
                setUserInput('/provider ' + suggestions[selectedIndex].name); setSuggestions([]); return;
            } else if (userInput.startsWith('/model ')) {
                setUserInput('/model ' + suggestions[selectedIndex].name); setSuggestions([]); return;
            } else if (userInput.startsWith('/')) {
                setUserInput(suggestions[selectedIndex].name + (suggestions[selectedIndex].name.includes(' ') ? '' : ' ')); setSuggestions([]); return;
            }
        }
    }

    if (!isBusy) {
      if (key.return) handleSubmit(userInput);
      else if (key.backspace || key.delete) setUserInput(u => u.slice(0, -1));
      else if (!key.ctrl && !key.meta && input) setUserInput(u => u + input);
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {showStats ? (
          <StatsView onClose={() => setShowStats(false)} />
      ) : (
        <>
            <Banner />

            <Box flexDirection="column" marginBottom={1}>
                {messages.map((msg, i) => (
                <Box key={i} marginBottom={1} flexDirection="column">
                    {msg.role === 'user' ? (
                        <Box backgroundColor="#333333" width="100%" paddingX={1}>
                            <Text color="white" bold>❯ </Text>
                            <Text>{msg.content}</Text>
                        </Box>
                    ) : (
                        <Box paddingLeft={1} flexDirection="row">
                            <Text color={CLAUDE_ORANGE} bold>● </Text>
                            <Box flexDirection="column" flexGrow={1} marginLeft={1}>
                                <Text>{(marked(msg.content) as string)}</Text>
                            </Box>
                        </Box>
                    )}
                </Box>
                ))}
            </Box>

            {approvalRequest && (
                <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow" marginY={1}>
                <Text color="yellow" bold>[!] Confirm Action</Text>
                <Text>Allow AI to run <Text color="cyan" bold>{approvalRequest.name}</Text>?</Text>
                <Box marginTop={1} borderColor="gray" borderStyle="single" paddingX={1}><Text color="gray">{JSON.stringify(approvalRequest.args, null, 2)}</Text></Box>
                <Box marginTop={1}><Text color="green" bold>y</Text><Text> to approve, </Text><Text color="red" bold>n</Text><Text> to deny</Text></Box>
                </Box>
            )}

            {activeMenu && (
                <SaxSelect 
                    badge={activeMenu.badge} 
                    question={activeMenu.question} 
                    options={activeMenu.options}
                    onSelect={(val) => {
                        setActiveMenu(null);
                        if (typeof val === 'string') handleSubmit(val);
                    }}
                />
            )}

            {toolCall && !approvalRequest && swarmTasks.length === 0 && (
                <Box marginLeft={2} marginBottom={1}><Text color="cyan">{">>"}</Text><Text color="gray"> Executing </Text><Text color="cyan" bold>{toolCall.name}</Text></Box>
            )}

            {swarmTasks.length > 0 && !approvalRequest && (
                <SwarmTracker tasks={swarmTasks} />
            )}

                {suggestions.length > 0 && (
            <Box marginY={1} flexDirection="column">
                <Box borderStyle="single" borderColor={CLAUDE_ORANGE} flexDirection="column" paddingX={1}>
                    {suggestions.map((s, i) => (
                        <Box key={i} justifyContent="flex-start">
                            <Box width={35}>
                                <Text color={i === selectedIndex ? 'white' : '#7dd3fc'} bold={i === selectedIndex}>
                                    {i === selectedIndex ? '❯ ' : '  '}
                                    {userInput.startsWith('/') && !userInput.includes(' ') ? '' : (userInput.includes('@') ? '@' : '')}{s.name}
                                </Text>
                            </Box>
                            <Box flexGrow={1}>
                                <Text color="gray" dimColor={i !== selectedIndex}>
                                    {s.desc}
                                </Text>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
                )}

                {isBusy && !approvalRequest ? (
                <Box>
                    <ClaudeSpinner 
                        message={currentVerb + '…'} 
                        duration={thinkingTime}
                        tokens={currentReceivedTokens > 0 ? currentReceivedTokens : undefined}
                    />
                    <Text italic color="gray"> {status}</Text>
                </Box>
                ) : !approvalRequest ? (
                <Box>
                    <Text color={CLAUDE_ORANGE} bold>❯ </Text>
                    <Text>{userInput}</Text>
                    {userInput === '' && <Text color="gray" dimColor>Ask anything...</Text>}
                </Box>
                ) : null}

            <Box marginTop={2} flexDirection="column">
                <Text color="gray" dimColor>────────────────────────────────────────────────────────────────────────────────</Text>
                <Box justifyContent="space-between" paddingX={1}>
                    <Box>
                        <Text color={isAutoApprove ? "green" : "gray"}>{isAutoApprove ? "MODE: AUTO" : "MODE: MANUAL"}</Text>
                        <Text color="gray" dimColor> | API: </Text>
                        <Text color="gray">{currentProvider}/{currentModel}</Text>
                        <Text color="gray" dimColor> | Total Cost: </Text>
                        <Text color="yellow" bold>${sessionCost.toFixed(4)}</Text>
                    </Box>
                    <Box>
                        <Text color="gray" dimColor>Session: </Text>
                        <Text color="gray">{agent?.getSessionId().slice(-8)}</Text>
                    </Box>
                </Box>
            </Box>
        </>
      )}
    </Box>
  );
};
