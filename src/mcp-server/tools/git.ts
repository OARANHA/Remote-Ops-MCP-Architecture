import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { validateRepositoryName, validatePath } from '../security/paths.js';
import { invalidInputError } from '../errors/index.js';
import { z } from 'zod';

export function registerGitTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // git_head() - Get git HEAD
  server.tool(
    'git_head',
    'Get the current git HEAD commit',
    { 
      target: z.string().describe('Target ID'),
      repository: z.string().describe('Repository path')
    },
    async ({ target, repository }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.GIT_READ);

        // Validate repository name
        if (!validateRepositoryName(repository)) {
          throw invalidInputError('repository', 'Invalid repository name');
        }

        // Validate path is within allowed paths
        const pathValidation = validatePath(repository, targetConfig.allowedPaths, config.security.denyPatterns);
        if (!pathValidation.valid) {
          throw invalidInputError('repository', pathValidation.error || 'Path validation failed');
        }

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'git',
          ['-C', pathValidation.resolvedPath!, 'rev-parse', 'HEAD'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'git_head',
          capability: CAPABILITIES.GIT_READ,
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
          tool: 'git_head',
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

  // git_status() - Get git status
  server.tool(
    'git_status',
    'Get git status',
    { 
      target: z.string().describe('Target ID'),
      repository: z.string().describe('Repository path')
    },
    async ({ target, repository }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.GIT_READ);

        // Validate repository name
        if (!validateRepositoryName(repository)) {
          throw invalidInputError('repository', 'Invalid repository name');
        }

        // Validate path
        const pathValidation = validatePath(repository, targetConfig.allowedPaths, config.security.denyPatterns);
        if (!pathValidation.valid) {
          throw invalidInputError('repository', pathValidation.error || 'Path validation failed');
        }

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'git',
          ['-C', pathValidation.resolvedPath!, 'status', '--short'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'git_status',
          capability: CAPABILITIES.GIT_READ,
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
          tool: 'git_status',
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

  // git_diff_summary() - Get git diff summary
  server.tool(
    'git_diff_summary',
    'Get git diff summary',
    { 
      target: z.string().describe('Target ID'),
      repository: z.string().describe('Repository path')
    },
    async ({ target, repository }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.GIT_READ);

        // Validate repository name
        if (!validateRepositoryName(repository)) {
          throw invalidInputError('repository', 'Invalid repository name');
        }

        // Validate path
        const pathValidation = validatePath(repository, targetConfig.allowedPaths, config.security.denyPatterns);
        if (!pathValidation.valid) {
          throw invalidInputError('repository', pathValidation.error || 'Path validation failed');
        }

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          'git',
          ['-C', pathValidation.resolvedPath!, 'diff', '--stat'],
          config.ssh.commandTimeout
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'git_diff_summary',
          capability: CAPABILITIES.GIT_READ,
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
          tool: 'git_diff_summary',
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
