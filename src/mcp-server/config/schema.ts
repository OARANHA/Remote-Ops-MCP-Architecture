import { z } from 'zod';

// IPv4 validation regex
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

// Verifier config schema
export const VerifierSchema = z.object({
  executable: z.string(),
  args: z.array(z.string()),
  timeout: z.number().int().min(1).max(300),
});

// Target configuration schema
export const TargetSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  host: z.string().regex(ipv4Regex, 'Invalid IPv4 address'),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(64),
  environment: z.string(),
  credentialRef: z.string().min(1),
  hostKeyFingerprint: z.string(),
  allowedPaths: z.array(z.string()).min(1),
  allowedServices: z.array(z.string()),
  capabilityProfile: z.string().min(1),
  verifiers: z.record(z.string(), VerifierSchema).optional(),
  disabled: z.boolean(),
});

export type Target = z.infer<typeof TargetSchema>;

// SSH config schema
export const SSHConfigSchema = z.object({
  connectTimeout: z.number().int().min(1000).max(30000),
  commandTimeout: z.number().int().min(1000).max(60000),
  poolSize: z.number().int().min(1).max(10),
  idleTimeout: z.number().int().min(10000).max(300000),
});

// Security config schema
export const SecurityConfigSchema = z.object({
  maxLogLines: z.number().int().min(1).max(1000),
  maxFileSize: z.number().int().min(1).max(1000000),
  maxOutputSize: z.number().int().min(1000).max(1000000),
  denyPatterns: z.array(z.string()),
});

// Audit config schema
export const AuditConfigSchema = z.object({
  enabled: z.boolean(),
  logLevel: z.string(),
  logPath: z.string(),
});

// Server config schema
export const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string(),
  protocolVersion: z.string(),
});

// Full configuration schema
export const ConfigSchema = z.object({
  server: ServerConfigSchema,
  targets: z.record(z.string(), TargetSchema),
  ssh: SSHConfigSchema,
  security: SecurityConfigSchema,
  audit: AuditConfigSchema,
});

export type Config = z.infer<typeof ConfigSchema>;

// Default configuration
export const defaultConfig: Config = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    protocolVersion: '2026-07-28',
  },
  targets: {},
  ssh: {
    connectTimeout: 5000,
    commandTimeout: 30000,
    poolSize: 3,
    idleTimeout: 60000,
  },
  security: {
    maxLogLines: 100,
    maxFileSize: 100000,
    maxOutputSize: 100000,
    denyPatterns: [
      '\\.env$',
      '\\.pem$',
      '\\.key$',
      'id_rsa',
      'id_ed25519',
      'credentials',
      'secrets',
      'tokens',
      '\\.ssh',
      '/etc/shadow',
      '/etc/passwd',
    ],
  },
  audit: {
    enabled: true,
    logLevel: 'info',
    logPath: './logs/audit.log',
  },
};
