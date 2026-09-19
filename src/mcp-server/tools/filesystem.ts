import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { validatePath } from '../security/paths.js';
import { pathDeniedError, secretPathDeniedError } from '../errors/index.js';
import { z } from 'zod';

export function registerFilesystemTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // list_directory() - List directory contents
  server.tool(
    'list_directory',
    'List directory contents (allowlisted paths only)',
    { 
      target: z.string().describe('Target ID'),
      path: z.string().describe('Directory path')
    },
    async ({ target, path: dirPath }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.FILESYSTEM_LIST);

        // Validate path
        const pathValidation = validatePath(dirPath, targetConfig.allowedPaths, config.security.denyPatterns);
        if (!pathValidation.valid) {
          if (pathValidation.error === 'SECRET_PATH_DENIED') {
            throw secretPathDeniedError(dirPath);
          }
          throw pathDeniedError(dirPath, pathValidation.error || 'Unknown reason');
        }

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'ls',
          ['-la', pathValidation.resolvedPath!],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'list_directory',
          capability: CAPABILITIES.FILESYSTEM_LIST,
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
          tool: 'list_directory',
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

  // read_file() - Read file contents
  server.tool(
    'read_file',
    'Read file contents (allowlisted paths only)',
    { 
      target: z.string().describe('Target ID'),
      path: z.string().describe('File path'),
      max_lines: z.number().optional().describe('Maximum lines to read (default 100)')
    },
    async ({ target, path: filePath, max_lines }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.FILESYSTEM_READ);

        // Validate path
        const pathValidation = validatePath(filePath, targetConfig.allowedPaths, config.security.denyPatterns);
        if (!pathValidation.valid) {
          if (pathValidation.error === 'SECRET_PATH_DENIED') {
            throw secretPathDeniedError(filePath);
          }
          throw pathDeniedError(filePath, pathValidation.error || 'Unknown reason');
        }

        // Limit lines
        const lines = Math.min(max_lines || 100, config.security.maxLogLines);

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'head',
          ['-n', String(lines), pathValidation.resolvedPath!],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'read_file',
          capability: CAPABILITIES.FILESYSTEM_READ,
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
          tool: 'read_file',
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
