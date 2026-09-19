// Structured audit logger
// Every MCP operation is logged with full context, never including secrets

export interface AuditEntry {
  timestamp: string;
  requestId: string;
  session?: string;
  actor?: string;
  target?: string;
  tool: string;
  capability?: string;
  mutation: boolean;
  durationMs: number;
  result: 'success' | 'error' | 'denied';
  errorCode?: string;
  errorMessage?: string;
  // For mutations
  beforeState?: Record<string, unknown>;
  requestedEffect?: string;
  afterState?: Record<string, unknown>;
  validationResult?: string;
}

export interface AuditLogger {
  log(entry: Omit<AuditEntry, 'timestamp'>): void;
  getEntries(filter?: Partial<AuditEntry>): AuditEntry[];
}

// In-memory audit store (replace with persistent storage in production)
const auditStore: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 10000;

// Secret patterns to redact from audit logs
const SECRET_PATTERNS = [
  /password[s]?\s*[:=]\s*\S+/gi,
  /token[s]?\s*[:=]\s*\S+/gi,
  /secret[s]?\s*[:=]\s*\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
  /bearer\s+\S+/gi,
  /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----[\s\S]*?-----END/gi,
];

function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    let redacted = value;
    for (const pattern of SECRET_PATTERNS) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
  }
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Skip keys that look like secrets
      if (/password|secret|token|key|credential|auth/i.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSecrets(val);
      }
    }
    return result;
  }
  return value;
}

export function createAuditLogger(): AuditLogger {
  return {
    log(entry: Omit<AuditEntry, 'timestamp'>): void {
      const fullEntry: AuditEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        // Redact any potential secrets from error messages
        errorMessage: entry.errorMessage
          ? redactSecrets(entry.errorMessage) as string
          : undefined,
      };

      auditStore.push(fullEntry);

      // Trim old entries
      if (auditStore.length > MAX_AUDIT_ENTRIES) {
        auditStore.splice(0, auditStore.length - MAX_AUDIT_ENTRIES);
      }

      // Console output for development
      const level = entry.result === 'success' ? 'INFO' : entry.result === 'denied' ? 'WARN' : 'ERROR';
      console.log(
        `[AUDIT] [${level}] ${entry.tool} target=${entry.target || 'N/A'} ` +
        `result=${entry.result} duration=${entry.durationMs}ms` +
        (entry.errorCode ? ` error=${entry.errorCode}` : '')
      );
    },

    getEntries(filter?: Partial<AuditEntry>): AuditEntry[] {
      if (!filter) return [...auditStore];
      
      return auditStore.filter(entry => {
        for (const [key, value] of Object.entries(filter)) {
          if (entry[key as keyof AuditEntry] !== value) return false;
        }
        return true;
      });
    },
  };
}

// Singleton audit logger
export const auditLogger = createAuditLogger();
