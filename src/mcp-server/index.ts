#!/usr/bin/env node
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { createMCPServer } from './server.js';
import { ConfigSchema, defaultConfig } from './config/schema.js';
import type { Config } from './config/schema.js';

/**
 * Remote Ops MCP Server
 * Entry point for the MCP server
 */

async function main() {
  console.log('[MCP] Starting Remote Ops MCP Server...');

  // Load configuration
  let config: Config;
  
  try {
    const configPath = process.env.MCP_CONFIG_PATH || './config/targets.yaml';
    console.log(`[MCP] Loading configuration from: ${configPath}`);
    
    const configFile = readFileSync(configPath, 'utf-8');
    const rawConfig = parse(configFile);
    
    // Merge with defaults
    config = ConfigSchema.parse({
      ...defaultConfig,
      ...rawConfig,
    });
    
    console.log(`[MCP] Configuration loaded successfully`);
  } catch (error) {
    console.error('[MCP] Failed to load configuration:', error);
    console.log('[MCP] Using default configuration');
    config = defaultConfig;
  }

  // Validate we have at least one target
  if (Object.keys(config.targets).length === 0) {
    console.warn('[MCP] WARNING: No targets configured. Server will start but no operations will be possible.');
    console.warn('[MCP] Add targets to config/targets.yaml and restart.');
  }

  // Create and start server
  const server = createMCPServer(config);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[MCP] Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[MCP] Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start server
  await server.start();

  console.log('[MCP] Server is ready to accept connections');
  console.log('[MCP] Press Ctrl+C to stop');
}

// Run main
main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
