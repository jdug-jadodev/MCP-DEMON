import { EventEmitter } from 'events';
import { info, warn, error, debug } from './utils/logger';

function errMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  try {
    return String(err);
  } catch {
    return 'Unknown error';
  }
}

export type ToolHandler = (input: any) => Promise<any> | any;

export interface ToolDefinition {
  handler: ToolHandler;
  description: string;
  inputSchema: any;
}

export class Server extends EventEmitter {
  private tools: Map<string, ToolDefinition>;

  constructor() {
    super();
    this.tools = new Map();
  }

  registerTool(name: string, handler: ToolHandler, description: string, inputSchema: any) {
    this.tools.set(name, { handler, description, inputSchema });
  }

  listTools() {
    const result: any[] = [];
    for (const [name, def] of this.tools) {
      result.push({ name, description: def.description, inputSchema: def.inputSchema });
    }
    return result;
  }

  async callTool(name: string, input: any) {
    const entry = this.tools.get(name);
    if (!entry) throw new Error('Tool not found: ' + name);
    const result = await Promise.resolve(entry.handler(input));
    return result;
  }
}

function send(obj: any) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// MCP-compliant line-delimited JSON-RPC 2.0 stdio transport
export function startStdioLoop(server: Server) {
  server.emit('startup');
  info('startup');
  const stdin = process.stdin;
  stdin.setEncoding('utf8');
  let buffer = '';

  stdin.on('data', async (chunk) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;

      let msg: any = null;
      try {
        msg = JSON.parse(line);
      } catch (err) {
        send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        warn('Invalid JSON received');
        continue;
      }

      try {
        debug('[mcp.recv]', msg);
        const method: string = msg.method || '';
        const id = msg.id ?? null;

        // --- Notifications (no id → no response) ---
        if (id === null || id === undefined) {
          if (method === 'notifications/initialized') {
            info('client sent notifications/initialized');
          } else if (method === 'notifications/cancelled') {
            // ignore cancellation for now
          } else {
            debug('unknown notification:', method);
          }
          continue;
        }

        // --- Requests (have id → require response) ---
        switch (method) {
          case 'initialize': {
            send({
              jsonrpc: '2.0', id,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'copilot-fs-mcp', version: '0.1.0' },
              },
            });
            server.emit('initialized', msg.params || {});
            info('initialized');
            break;
          }

          case 'tools/list': {
            const tools = server.listTools();
            send({ jsonrpc: '2.0', id, result: { tools } });
            info('tools/list', { count: tools.length });
            break;
          }

          case 'tools/call': {
            const toolName: string = msg.params?.name;
            const args = msg.params?.arguments ?? msg.params?.input ?? {};
            try {
              const start = Date.now();
              const result = await server.callTool(toolName, args);
              const duration = Date.now() - start;
              const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
              send({
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text }] },
              });
              info('tools/call', { tool: toolName, duration_ms: duration });
            } catch (err) {
              send({
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: 'Error: ' + errMessage(err) }], isError: true },
              });
              warn('tools/call error', { tool: toolName, err: errMessage(err) });
            }
            break;
          }

          case 'logging/setLevel': {
            // Acknowledge but no-op for now
            send({ jsonrpc: '2.0', id, result: {} });
            break;
          }

          default: {
            send({
              jsonrpc: '2.0', id,
              error: { code: -32601, message: 'Method not found: ' + method },
            });
            warn('Unknown method:', method);
          }
        }
      } catch (err) {
        warn('Processing error:', errMessage(err));
        send({
          jsonrpc: '2.0', id: msg?.id ?? null,
          error: { code: -32603, message: 'Internal error: ' + errMessage(err) },
        });
      }
    }
  });

  stdin.on('end', () => {
    server.emit('shutdown');
    process.exit(0);
  });

  server.emit('ready');
}
