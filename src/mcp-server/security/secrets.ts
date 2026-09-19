// Secret redaction for Docker inspect, logs, and other outputs

// Patterns that indicate secrets
const SECRET_PATTERNS = [
  // API keys and tokens
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi, replacement: '[API_KEY_REDACTED]' },
  { pattern: /(?:access[_-]?token|auth[_-]?token)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{20,})["']?/gi, replacement: '[TOKEN_REDACTED]' },
  { pattern: /(?:secret[_-]?key|secret)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi, replacement: '[SECRET_REDACTED]' },
  
  // Bearer tokens
  { pattern: /Bearer\s+([a-zA-Z0-9_\-\.]+)/gi, replacement: 'Bearer [TOKEN_REDACTED]' },
  
  // Private keys
  { pattern: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----[\s\S]*?-----END\s+\1\s*PRIVATE KEY-----/gi, replacement: '[PRIVATE_KEY_REDACTED]' },
  
  // Passwords in connection strings
  { pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^:]+:([^@]+)@/gi, replacement: '$1://[PASSWORD_REDACTED]@' },
  
  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[AWS_ACCESS_KEY_REDACTED]' },
  { pattern: /(?:aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*["']?([a-zA-Z0-9\/+=]{40})["']?/gi, replacement: '[AWS_SECRET_REDACTED]' },
  
  // Generic high-entropy strings that look like secrets
  { pattern: /["']?([a-zA-Z0-9_\-]{32,})["']?(?=\s*[,\n}])/g, replacement: '[POTENTIAL_SECRET_REDACTED]' },
];

// Environment variable names that typically contain secrets
const SECRET_ENV_VARS = [
  'PASSWORD',
  'SECRET',
  'TOKEN',
  'KEY',
  'CREDENTIAL',
  'AUTH',
  'PRIVATE',
  'API_KEY',
  'ACCESS_KEY',
  'DATABASE_URL',
  'MONGO_URI',
  'POSTGRES_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

/**
 * Redacts secrets from a string
 */
export function redactSecrets(input: string): string {
  let output = input;
  
  for (const { pattern, replacement } of SECRET_PATTERNS) {
    output = output.replace(pattern, replacement);
  }
  
  return output;
}

/**
 * Redacts secrets from Docker inspect output
 * Removes Config.Env, Auth, RegistryConfig, and other sensitive fields
 */
export function redactDockerInspect(inspectData: any): any {
  if (!inspectData || typeof inspectData !== 'object') {
    return inspectData;
  }

  const redacted = { ...inspectData };

  // Redact Config.Env
  if (redacted.Config?.Env) {
    redacted.Config.Env = redacted.Config.Env.map((env: string) => {
      const [key, ...valueParts] = env.split('=');
      const value = valueParts.join('=');
      
      // Check if this env var looks like a secret
      const isSecret = SECRET_ENV_VARS.some(secretVar => 
        key.toUpperCase().includes(secretVar)
      );
      
      if (isSecret) {
        return `${key}=[REDACTED]`;
      }
      
      // Also redact if value looks like a secret (high entropy, long)
      if (value && value.length > 20 && /^[a-zA-Z0-9_\-\/+=]+$/.test(value)) {
        return `${key}=[REDACTED]`;
      }
      
      return env;
    });
  }

  // Redact Auth
  if (redacted.Auth) {
    redacted.Auth = '[REDACTED]';
  }

  // Redact RegistryConfig
  if (redacted.RegistryConfig) {
    redacted.RegistryConfig = '[REDACTED]';
  }

  // Redact sensitive labels
  if (redacted.Config?.Labels) {
    const sensitiveLabels = ['password', 'secret', 'token', 'key', 'credential'];
    for (const label of Object.keys(redacted.Config.Labels)) {
      if (sensitiveLabels.some(s => label.toLowerCase().includes(s))) {
        redacted.Config.Labels[label] = '[REDACTED]';
      }
    }
  }

  // Redact Mount secrets
  if (redacted.Mounts) {
    redacted.Mounts = redacted.Mounts.map((mount: any) => {
      if (mount.Source && (
        mount.Source.includes('secret') ||
        mount.Source.includes('credential') ||
        mount.Source.includes('.env')
      )) {
        return { ...mount, Source: '[REDACTED]' };
      }
      return mount;
    });
  }

  return redacted;
}

/**
 * Redacts secrets from log output
 */
export function redactLogs(logs: string): string {
  return redactSecrets(logs);
}

/**
 * Checks if a string contains potential secrets
 */
export function containsSecrets(input: string): boolean {
  for (const { pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}
