import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TargetRegistry } from '../targets/registry.js';
import type { CapabilityEngine } from '../capabilities/engine.js';
import type { SSHClient } from '../ssh/client.js';
import type { Config } from '../config/schema.js';
import { registerHealthTools } from './health.js';
import { registerTargetTools } from './targets.js';
import { registerSystemTools } from './system.js';
import { registerDockerTools } from './docker.js';
import { registerServiceTools } from './services.js';
import { registerGitTools } from './git.js';
import { registerFilesystemTools } from './filesystem.js';
import { registerVerifierTools } from './verifiers.js';

/**
 * Registers all MCP tools with the server
 * This is the central registry for all 21 tools
 */
export function registerAllTools(
  server: McpServer,
  registry: TargetRegistry,
  capabilities: CapabilityEngine,
  sshClient: SSHClient,
  config: Config
): void {
  // Meta tools
  registerHealthTools(server, registry, capabilities, sshClient, config);
  registerTargetTools(server, registry, capabilities, sshClient, config);

  // System tools
  registerSystemTools(server, registry, capabilities, sshClient, config);

  // Docker tools
  registerDockerTools(server, registry, capabilities, sshClient, config);

  // Service tools
  registerServiceTools(server, registry, capabilities, sshClient, config);

  // Git tools
  registerGitTools(server, registry, capabilities, sshClient, config);

  // Filesystem tools
  registerFilesystemTools(server, registry, capabilities, sshClient, config);

  // Verifier tools
  registerVerifierTools(server, registry, capabilities, sshClient, config);

  console.log('[MCP] All 21 tools registered successfully');
}
