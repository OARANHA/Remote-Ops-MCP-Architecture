import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { z } from 'zod';

export function registerTargetTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // targets_list() - List all registered targets
  server.tool(
    'targets_list',
    'List all registered VPS targets',
    {},
    async () => {
      const startTime = Date.now();
      try {
        const targets = registry.listTargets().map(t => ({
          id: t.id,
          environment: t.environment,
          capabilityProfile: t.capabilityProfile,
          disabled: t.disabled,
          allowedServices: t.allowedServices.length,
          allowedPaths: t.allowedPaths.length,
        }));

        auditLogger.log({
          requestId: crypto.randomUUID(),
          tool: 'targets_list',
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(targets, null, 2) }],
        };
      } catch (error) {
        auditLogger.log({
          requestId: crypto.randomUUID(),
          tool: 'targets_list',
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

  // target_status() - Get target status
  server.tool(
    'target_status',
    'Get the status of a specific target',
    { target: z.string().describe('Target ID') },
    async ({ target }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);

        const result = {
          id: targetConfig.id,
          host: targetConfig.host,
          port: targetConfig.port,
          username: targetConfig.username,
          environment: targetConfig.environment,
          capabilityProfile: targetConfig.capabilityProfile,
          disabled: targetConfig.disabled,
          allowedServices: targetConfig.allowedServices,
          allowedPaths: targetConfig.allowedPaths,
        };

        auditLogger.log({
          requestId,
          target,
          tool: 'target_status',
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        auditLogger.log({
          requestId,
          target,
          tool: 'target_status',
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'error',
          errorCode: error instanceof Error ? error.name : 'UNKNOWN',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }
  );
}
