import { spawn, ChildProcess } from 'child_process';
import { createInterface, Interface } from 'readline';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export class McpClient {
  private process: ChildProcess | null = null;
  private rl: Interface | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, (res: any) => void>();

  constructor(private command: string, private args: string[] = []) {}

  async connect() {
    this.process = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'inherit'] });
    this.rl = createInterface({ input: this.process.stdout! });

    this.rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        if (response.id !== undefined && this.pendingRequests.has(response.id)) {
          this.pendingRequests.get(response.id)!(response.result);
          this.pendingRequests.delete(response.id);
        }
      } catch (e) {}
    });

    // Initialize MCP
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'SaxCode', version: '1.0.0' }
    });
  }

  private request(method: string, params: any) {
    return new Promise((resolve) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, resolve);
      this.process?.stdin?.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  async listTools(): Promise<McpTool[]> {
    const res: any = await this.request('listTools', {});
    return res.tools || [];
  }

  async callTool(name: string, args: any) {
    const res: any = await this.request('callTool', { name, arguments: args });
    return res.content?.[0]?.text || JSON.stringify(res);
  }

  disconnect() {
    this.process?.kill();
  }
}
