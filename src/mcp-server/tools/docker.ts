import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { validateServiceName, validateLogLines } from '../security/paths.js';
import { redactDockerInspect, redactLogs } from '../security/secrets.js';
import { serviceNotAllowedError } from '../errors/index.js';
import { z } from 'zod';

export function registerDockerTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // docker_list() - List Docker containers
  server.tool(
    'docker_list',
    'List Docker containers on the target',
    { target: z.string().describe('Target ID') },
    async ({ target }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.DOCKER_READ);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'docker',
          ['ps', '--format', 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'docker_list',
          capability: CAPABILITIES.DOCKER_READ,
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
          tool: 'docker_list',
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

  // docker_health() - Check container health
  server.tool(
    'docker_health',
    'Check Docker container health status',
    { 
      target: z.string().describe('Target ID'),
      service: z.string().describe('Service/container name')
    },
    async ({ target, service }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.DOCKER_READ);

        // Validate service name
        if (!validateServiceName(service, targetConfig.allowedServices)) {
          throw serviceNotAllowedError(service, target);
        }

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'docker',
          ['inspect', '--format', '{{.State.Health.Status}}', service],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'docker_health',
          capability: CAPABILITIES.DOCKER_READ,
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
          tool: 'docker_health',
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

  // docker_inspect_safe() - Safe container inspect (secrets redacted)
  server.tool(
    'docker_inspect_safe',
    'Inspect Docker container with secrets redacted',
    { 
      target: z.string().describe('Target ID'),
      service: z.string().describe('Service/container name')
    },
    async ({ target, service }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.DOCKER_INSPECT_SAFE);

        // Validate service name
        if (!validateServiceName(service, targetConfig.allowedServices)) {
          throw serviceNotAllowedError(service, target);
        }

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'docker',
          ['inspect', service],
          config.ssh.commandTimeout
        );

        // Parse and redact secrets
        const inspectData = JSON.parse(result.stdout);
        const redactedData = Array.isArray(inspectData) 
          ? inspectData.map(redactDockerInspect)
          : redactDockerInspect(inspectData);

        auditLogger.log({
          requestId,
          target,
          tool: 'docker_inspect_safe',
          capability: CAPABILITIES.DOCKER_INSPECT_SAFE,
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(redactedData, null, 2) }],
        };
      } catch (error) {
        auditLogger.log({
          requestId,
          target,
          tool: 'docker_inspect_safe',
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

  // docker_logs() - Read container logs (bounded, redacted)
  server.tool(
    'docker_logs',
    'Read Docker container logs with secrets redacted',
    { 
      target: z.string().describe('Target ID'),
      service: z.string().describe('Service/container name'),
      lines: z.number().optional().describe('Number of log lines (max 1000, default 100)')
    },
    async ({ target, service, lines }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.DOCKER_LOGS);

        // Validate service name
        if (!validateServiceName(service, targetConfig.allowedServices)) {
          throw serviceNotAllowedError(service, target);
        }

        // Validate and bound log lines
        const boundedLines = validateLogLines(lines || 100, config.security.maxLogLines);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'docker',
          ['logs', '--tail', String(boundedLines), service],
          config.ssh.commandTimeout
        );

        // Redact secrets from logs
        const redactedLogs = redactLogs(result.stdout);

        auditLogger.log({
          requestId,
          target,
          tool: 'docker_logs',
          capability: CAPABILITIES.DOCKER_LOGS,
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
          tool: 'docker_logs',
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
