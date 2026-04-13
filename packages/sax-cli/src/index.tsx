import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './ui/App.tsx';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const program = new Command();

program
  .name('sax')
  .description('SaxCode - High-fidelity AI Coding Agent (Bun + Ink)')
  .version('1.0.0');

program
  .argument('[prompt...]', 'The task for the agent')
  .option('--resume <id>', 'Resume a specific previous session')
  .action(async (promptParts: string[], options: { resume?: string }) => {
    const prompt = promptParts.join(' ');
    
    // We need to capture the session ID to show it on exit
    let finalSessionId = '';
    const onSessionReady = (id: string) => { finalSessionId = id; };

    const { waitUntilExit } = render(
        <App 
            initialPrompt={prompt || ''} 
            resumeId={options.resume} 
            onSessionReady={onSessionReady} 
        />
    );

    await waitUntilExit();

    // The "Claude Code" Style Exit Message
    if (finalSessionId) {
        console.log('\n' + chalk.gray('─'.repeat(process.stdout.columns || 40)));
        console.log(chalk.cyan.bold(' 👋 Goodbye!'));
        console.log(chalk.white(' To resume this session, run:'));
        console.log(chalk.yellow.bold(`  bun run dev -- --resume ${finalSessionId}`));
        console.log(chalk.gray('─'.repeat(process.stdout.columns || 40)) + '\n');
    }
  });

program.parse();
