import chalk from 'chalk';
import ora from 'ora';

const CLAUDE_ORANGE = '#da7756';
const orange = chalk.hex(CLAUDE_ORANGE);

export const logger = {
  info: (msg: string) => console.log(`${chalk.blue('ℹ')} ${msg}`),
  success: (msg: string) => console.log(`${chalk.green('✔')} ${msg}`),
  warn: (msg: string) => console.log(`${chalk.yellow('⚠')} ${msg}`),
  error: (msg: string) => console.log(`${chalk.red('✖')} ${msg}`),
  agent: (msg: string) => console.log(`${orange('◈')} ${chalk.bold(msg)}`),
  tool: (name: string, args: any) => {
    console.log(`${chalk.cyan('⚒')} Executing ${chalk.cyan.bold(name)}...`);
    if (args) {
      console.log(chalk.gray(`  ${JSON.stringify(args)}`));
    }
  },
  spinner: (msg: string) => ora({
    text: msg,
    color: 'yellow', // ora doesn't support custom hex, yellow is closest to orange
    spinner: 'dots'
  }).start()
};

export const printBanner = () => {
  console.log('\n' + orange.bold('  ██████╗  █████╗ ██╗  ██╗ ██████╗ ██████╗ ██████╗ ███████╗') + '\n' +
    orange.bold(' ██╔════╝ ██╔══██╗╚██╗██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝') + '\n' +
    orange.bold(' ╚█████╗  ███████║ ╚███╔╝ ██║     ██║   ██║██║  ██║█████╗  ') + '\n' +
    orange.bold('  ╚═══██╗ ██╔══██║ ██╔██╗ ██║     ██║   ██║██║  ██║██╔══╝  ') + '\n' +
    orange.bold(' ██████╔╝ ██║  ██║██╔╝ ██╗╚██████╗╚██████╔╝██████╔╝███████╗') + '\n' +
    orange.bold(' ╚═════╝  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝') + '\n');
  console.log(chalk.gray('  ' + '-'.repeat(55)));
  console.log(`  ${chalk.bold('SaxCode')} v1.0.0 - ${chalk.italic('Your dynamic agentic coding partner')}`);
  console.log(chalk.gray('  ' + '-'.repeat(55)) + '\n');
};
