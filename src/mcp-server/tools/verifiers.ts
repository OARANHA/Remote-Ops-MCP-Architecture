import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { CAPABILITIES } from '../capabilities/engine.js';
import { executeRemoteCommand } from '../ssh/client.js';
import { auditLogger } from '../audit/logger.js';
import { invalidInputError } from '../errors/index.js';
import { z } from 'zod';

export function registerVerifierTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // run_verifier() - Run a registered verifier
  server.tool(
    'run_verifier',
    'Run a registered verification script',
    { 
      target: z.string().describe('Target ID'),
      verifier_id: z.string().describe('Verifier ID')
    },
    async ({ target, verifier_id }) => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      try {
        const targetConfig = registry.getTarget(target);
        capabilities.checkCapability(targetConfig, CAPABILITIES.VERIFIER_RUN);

        // Check if verifier exists
        if (!targetConfig.verifiers || !targetConfig.verifiers[verifier_id]) {
          throw invalidInputError('verifier_id', `Verifier "${verifier_id}" not found for target "${target}"`);
        }

        const verifier = targetConfig.verifiers[verifier_id];

        const result = await executeRemoteCommand(
          sshClient,
          targetConfig,
          verifier.executable,
          verifier.args,
          verifier.timeout * 1000 // Convert to milliseconds
        );

        auditLogger.log({
          requestId,
          target,
          tool: 'run_verifier',
          capability: CAPABILITIES.VERIFIER_RUN,
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
          tool: 'run_verifier',
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
