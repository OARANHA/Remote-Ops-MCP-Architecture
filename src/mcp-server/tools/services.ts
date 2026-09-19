import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { validateServiceName, validateLogLines } from '../security/paths.js';
import { redactLogs } from '../security/secrets.js';
import { serviceNotAllowedError } from '../errors/index.js';
import { z } from 'zod';

export function registerServiceTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // service_status() - Check service status
  server.tool(
    'service_status',
    'Check systemd service status',
    { 
      target: z.string().describe('Target ID'),
      service: z.string().describe('Service name')
    },
    async ({ target, service }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.SYSTEMD_READ);

        // Validate service name
        if (!validateServiceName(service, targetConfig.allowedServices)) {
          throw serviceNotAllowedError(service, target);
        }

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'systemctl',
          ['status', service, '--no-pager'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'service_status',
          capability: CAPABILITIES.SYSTEMD_READ,
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: result.stdout }],
        };
      } catch (error) {
        auditLogger.log({
          requestId,
          target,
          tool: 'service_status',
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

  // service_logs() - Read service logs
  server.tool(
    'service_logs',
    'Read systemd service logs with secrets redacted',
    { 
      target: z.string().describe('Target ID'),
      service: z.string().describe('Service name'),
      lines: z.number().optional().describe('Number of log lines (max 1000, default 100)')
    },
    async ({ target, service, lines }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.SYSTEMD_READ);

        // Validate service name
        if (!validateServiceName(service, targetConfig.allowedServices)) {
          throw serviceNotAllowedError(service, target);
        }

        // Validate and bound log lines
        const boundedLines = validateLogLines(lines || 100, config.security.maxLogLines);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'journalctl',
          ['-u', service, '-n', String(boundedLines), '--no-pager'],
          config.ssh.commandTimeout
        );

        // Redact secrets from logs
        const redactedLogs = redactLogs(result.stdout);

        auditLogger.log({
          requestId,
          target,
          tool: 'service_logs',
          capability: CAPABILITIES.SYSTEMD_READ,
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: redactedLogs }],
        };
      } catch (error) {
        auditLogger.log({
          requestId,
          target,
          tool: 'service_logs',
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
