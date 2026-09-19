import * as path from 'path';
import { pathDeniedError, secretPathDeniedError } from '../errors/index.js';

// Secret deny patterns - these paths are NEVER accessible
const SECRET_PATTERNS = [
  /\.env$/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /id_ecdsa/i,
  /credentials/i,
  /secrets/i,
  /tokens/i,
  /\.ssh/i,
  /\/etc\/shadow/i,
  /\/etc\/passwd/i,
  /\/etc\/ssh/i,
  /\.htpasswd/i,
  /\.pgpass/i,
  /my\.cnf/i,
  /\.my\.cnf/i,
  /wp-config\.php/i,
  /configuration\.php/i,
  /settings\.py/i,
  /local_settings\.py/i,
];

// Path traversal patterns
const TRAVERSAL_PATTERNS = [
  /\.\.\//,           // ../
  /\.\.\\/,           // ..\
  /%2e%2e/i,          // URL encoded ../
  /%252e%252e/i,      // Double URL encoded
  /\.\.%2f/i,         // Mixed encoding
  /%2e%2e%5c/i,       // URL encoded ..\
];

export interface PathValidationResult {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
}

/**
 * Validates a path against allowlist and deny rules
 * This is the core security function for filesystem access
 */
export function validatePath(
  inputPath: string,
  allowedRoots: string[],
  denyPatterns: string[] = []
): PathValidationResult {
  // 1. Reject null bytes
  if (inputPath.includes('\0')) {
    return {
      valid: false,
      error: 'NULL_BYTE_DETECTED',
    };
  }

  // 2. Check for traversal patterns
  for (const pattern of TRAVERSAL_PATTERNS) {
    if (pattern.test(inputPath)) {
      return {
        valid: false,
        error: 'PATH_TRAVERSAL_DETECTED',
      };
    }
  }

  // 3. Check secret deny patterns (always, even before allowlist)
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(inputPath)) {
      return {
        valid: false,
        error: 'SECRET_PATH_DENIED',
      };
    }
  }

  // 4. Check custom deny patterns from config
  for (const pattern of denyPatterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(inputPath)) {
        return {
          valid: false,
          error: 'CUSTOM_DENY_PATTERN_MATCHED',
        };
      }
    } catch {
      // Invalid regex in config, skip
    }
  }

  // 5. Normalize path (remove . and ..)
  const normalizedPath = path.normalize(inputPath);

  // 6. Check if path is absolute
  if (!path.isAbsolute(normalizedPath)) {
    return {
      valid: false,
      error: 'PATH_MUST_BE_ABSOLUTE',
    };
  }

  // 7. Check against allowed roots
  // In a real implementation, we would use fs.realpathSync to resolve symlinks
  // For now, we do string-based validation
  const isAllowed = allowedRoots.some(root => {
    const normalizedRoot = path.normalize(root);
    return normalizedPath === normalizedRoot || 
           normalizedPath.startsWith(normalizedRoot + path.sep);
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: 'PATH_OUTSIDE_ALLOWLIST',
    };
  }

  return {
    valid: true,
    resolvedPath: normalizedPath,
  };
}

/**
 * Validates a service name against allowlist
 * Prevents command injection via service names
 */
export function validateServiceName(
  serviceName: string,
  allowedServices: string[]
): boolean {
  // Reject if contains shell metacharacters
  const shellMetacharacters = /[;&|`$(){}[\]<>!#*?~\\]/;
  if (shellMetacharacters.test(serviceName)) {
    return false;
  }

  // Must be in allowlist
  return allowedServices.includes(serviceName);
}

/**
 * Validates a repository name
 * Prevents command injection via repository names
 */
export function validateRepositoryName(repoName: string): boolean {
  // Reject if contains shell metacharacters
  const shellMetacharacters = /[;&|`$(){}[\]<>!#*~\\]/;
  if (shellMetacharacters.test(repoName)) {
    return false;
  }

  // Must be alphanumeric with dashes, underscores, dots, slashes
  return /^[a-zA-Z0-9._\-\/]+$/.test(repoName);
}

/**
 * Validates a target ID
 */
export function validateTargetId(targetId: string): boolean {
  // Must be lowercase alphanumeric with dashes
  return /^[a-z0-9-]+$/.test(targetId) && targetId.length <= 64;
}

/**
 * Validates log lines parameter
 */
export function validateLogLines(lines: number, maxLines: number): number {
  if (typeof lines !== 'number' || isNaN(lines)) {
    return 100; // default
  }
  return Math.min(Math.max(1, Math.floor(lines)), maxLines);
}
