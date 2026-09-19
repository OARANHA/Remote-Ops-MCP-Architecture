import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { createTargetRegistry } from './targets/registry.js';
import { createCapabilityEngine } from './capabilities/engine.js';
import { createSSHClient } from './ssh/client.js';
import { registerAllTools } from './tools/index.js';
import type { Config } from './config/schema.js';

export interface MCPServerInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Creates and configures the Remote Ops MCP server
 * Uses Streamable HTTP transport (MCP 2026-07-28)
 */
export function createMCPServer(config: Config): MCPServerInstance {
  const app = express();
  app.use(express.json());

  // Create core components
  const registry = createTargetRegistry(config);
  const capabilities = createCapabilityEngine();
  const sshClient = createSSHClient();

  // Health endpoints
  app.get('/healthz', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/readyz', (req: Request, res: Response) => {
    const targets = registry.listTargets();
    const activeTargets = targets.filter(t => !t.disabled);
    res.json({ 
      ready: activeTargets.length > 0, 
      activeTargets: activeTargets.length,
      timestamp: new Date().toISOString() 
    });
  });

  // MCP endpoint
  const mcpServer = new McpServer(
    {
      name: 'remote-ops-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all 21 tools
  registerAllTools(mcpServer, registry, capabilities, sshClient, config);

  // Create Streamable HTTP transport
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  // Connect MCP server to transport
  mcpServer.connect(transport);

  // Handle MCP requests
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('[MCP] Error handling request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  let server: any = null;

  return {
    async start(): Promise<void> {
      return new Promise((resolve) => {
        server = app.listen(config.server.port, config.server.host, () => {
          console.log(`[MCP] Remote Ops MCP server started`);
          console.log(`[MCP] Listening on ${config.server.host}:${config.server.port}`);
          console.log(`[MCP] MCP endpoint: http://${config.server.host}:${config.server.port}/mcp`);
          console.log(`[MCP] Health: http://${config.server.host}:${config.server.port}/healthz`);
          console.log(`[MCP] Ready: http://${config.server.host}:${config.server.port}/readyz`);
          console.log(`[MCP] Protocol version: ${config.server.protocolVersion}`);
          console.log(`[MCP] Registered targets: ${registry.listTargets().length}`);
          resolve();
        });
      });
    },

    async stop(): Promise<void> {
      return new Promise((resolve) => {
        if (server) {
          server.close(() => {
            sshClient.close();
            console.log('[MCP] Server stopped');
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
  };
}
