import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { z } from 'zod';

export function registerHealthTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // health() - Server health check
  server.tool(
    'health',
    'Check if the Remote Ops MCP server is healthy',
    {},
    async () => {
      const startTime = Date.now();
      try {
        const result = {
          status: 'healthy',
          version: '1.0.0',
          protocolVersion: config.server.protocolVersion,
          targets: registry.listTargets().length,
          timestamp: new Date().toISOString(),
        };

        auditLogger.log({
          requestId: crypto.randomUUID(),
          tool: 'health',
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        auditLogger.log({
          requestId: crypto.randomUUID(),
          tool: 'health',
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'error',
          errorCode: 'INTERNAL_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }
  );

  // ready() - Readiness check
  server.tool(
    'ready',
    'Check if the Remote Ops MCP server is ready to accept requests',
    {},
    async () => {
      const startTime = Date.now();
      try {
        const targets = registry.listTargets();
        const activeTargets = targets.filter(t => !t.disabled);

        const result = {
          ready: activeTargets.length > 0,
          activeTargets: activeTargets.length,
          totalTargets: targets.length,
          timestamp: new Date().toISOString(),
        };

        auditLogger.log({
          requestId: crypto.randomUUID(),
          tool: 'ready',
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        auditLogger.log({
          requestId: crypto.randomUUID(),
          tool: 'ready',
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'error',
          errorCode: 'INTERNAL_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }
  );
}
