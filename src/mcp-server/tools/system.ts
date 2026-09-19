import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { z } from 'zod';

export function registerSystemTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // host_status() - Get host system info
  server.tool(
    'host_status',
    'Get host system information',
    { target: z.string().describe('Target ID') },
    async ({ target }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.HOST_READ);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'uname',
          ['-a'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'host_status',
          capability: CAPABILITIES.HOST_READ,
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
          tool: 'host_status',
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

  // disk_usage() - Get disk usage
  server.tool(
    'disk_usage',
    'Get disk usage information',
    { target: z.string().describe('Target ID') },
    async ({ target }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.HOST_READ);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'df',
          ['-h'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'disk_usage',
          capability: CAPABILITIES.HOST_READ,
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
          tool: 'disk_usage',
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

  // memory_status() - Get memory status
  server.tool(
    'memory_status',
    'Get memory status',
    { target: z.string().describe('Target ID') },
    async ({ target }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.HOST_READ);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'free',
          ['-h'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'memory_status',
          capability: CAPABILITIES.HOST_READ,
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
          tool: 'memory_status',
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

  // uptime() - Get system uptime
  server.tool(
    'uptime',
    'Get system uptime',
    { target: z.string().describe('Target ID') },
    async ({ target }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.HOST_READ);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'uptime',
          [],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'uptime',
          capability: CAPABILITIES.HOST_READ,
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
          tool: 'uptime',
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

  // runtime_summary() - Full runtime summary
  server.tool(
    'runtime_summary',
    'Get a comprehensive runtime summary of the target',
    { target: z.string().describe('Target ID') },
    async ({ target }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.HOST_READ);

        // Execute multiple commands and combine results
        const [uname, uptime, memory, disk] = await Promise.all([
          executeRemoteCommand(sshClient, targetConfig, 'uname', ['-r'], config.ssh.commandTimeout),
          executeRemoteCommand(sshClient, targetConfig, 'uptime', ['-p'], config.ssh.commandTimeout),
          executeRemoteCommand(sshClient, targetConfig, 'free', ['-h'], config.ssh.commandTimeout),
          executeRemoteCommand(sshClient, targetConfig, 'df', ['-h', '/'], config.ssh.commandTimeout),
        ]);

        const summary = {
          kernel: uname.stdout,
          uptime: uptime.stdout,
          memory: memory.stdout,
          disk: disk.stdout,
        };

        auditLogger.log({
          requestId,
          target,
          tool: 'runtime_summary',
          capability: CAPABILITIES.HOST_READ,
          mutation: false,
          durationMs: Date.now() - startTime,
          result: 'success',
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
        };
      } catch (error) {
        auditLogger.log({
          requestId,
          target,
          tool: 'runtime_summary',
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
