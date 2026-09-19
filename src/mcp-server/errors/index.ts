// Structured error codes for the Remote Ops MCP
export enum ErrorCode {
  TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
  TARGET_DISABLED = 'TARGET_DISABLED',
  CAPABILITY_DENIED = 'CAPABILITY_DENIED',
  PATH_DENIED = 'PATH_DENIED',
  SECRET_PATH_DENIED = 'SECRET_PATH_DENIED',
  SERVICE_NOT_ALLOWED = 'SERVICE_NOT_ALLOWED',
  SSH_UNAVAILABLE = 'SSH_UNAVAILABLE',
  HOST_KEY_MISMATCH = 'HOST_KEY_MISMATCH',
  COMMAND_TIMEOUT = 'COMMAND_TIMEOUT',
  REMOTE_COMMAND_FAILED = 'REMOTE_COMMAND_FAILED',
  OUTPUT_LIMIT_EXCEEDED = 'OUTPUT_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  RATE_LIMITED = 'RATE_LIMITED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class MCPError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

// Factory functions for common errors
export function targetNotFoundError(targetId: string): MCPError {
  return new MCPError(
    ErrorCode.TARGET_NOT_FOUND,
    `Target "${targetId}" not found in registry`,
    404,
    { targetId }
  );
}

export function targetDisabledError(targetId: string): MCPError {
  return new MCPError(
    ErrorCode.TARGET_DISABLED,
    `Target "${targetId}" is disabled`,
    403,
    { targetId }
  );
}

export function capabilityDeniedError(capability: string, targetId: string): MCPError {
  return new MCPError(
    ErrorCode.CAPABILITY_DENIED,
    `Capability "${capability}" is not allowed for target "${targetId}"`,
    403,
    { capability, targetId }
  );
}

export function pathDeniedError(path: string, reason: string): MCPError {
  return new MCPError(
    ErrorCode.PATH_DENIED,
    `Path "${path}" is denied: ${reason}`,
    403,
    { path, reason }
  );
}

export function secretPathDeniedError(path: string): MCPError {
  return new MCPError(
    ErrorCode.SECRET_PATH_DENIED,
    `Path "${path}" matches secret deny rules`,
    403,
    { path }
  );
}

export function serviceNotAllowedError(service: string, targetId: string): MCPError {
  return new MCPError(
    ErrorCode.SERVICE_NOT_ALLOWED,
    `Service "${service}" is not allowed for target "${targetId}"`,
    403,
    { service, targetId }
  );
}

export function sshUnavailableError(targetId: string, reason?: string): MCPError {
  return new MCPError(
    ErrorCode.SSH_UNAVAILABLE,
    `SSH connection to "${targetId}" failed${reason ? `: ${reason}` : ''}`,
    503,
    { targetId, reason }
  );
}

export function hostKeyMismatchError(targetId: string): MCPError {
  return new MCPError(
    ErrorCode.HOST_KEY_MISMATCH,
    `SSH host key mismatch for target "${targetId}". Possible MITM attack. FAIL CLOSED.`,
    503,
    { targetId }
  );
}

export function commandTimeoutError(targetId: string, timeout: number): MCPError {
  return new MCPError(
    ErrorCode.COMMAND_TIMEOUT,
    `Command timed out after ${timeout}ms on target "${targetId}"`,
    504,
    { targetId, timeout }
  );
}

export function remoteCommandFailedError(targetId: string, exitCode: number, stderr: string): MCPError {
  return new MCPError(
    ErrorCode.REMOTE_COMMAND_FAILED,
    `Remote command failed on "${targetId}" with exit code ${exitCode}`,
    500,
    { targetId, exitCode, stderr: stderr.substring(0, 500) }
  );
}

export function outputLimitExceededError(limit: number): MCPError {
  return new MCPError(
    ErrorCode.OUTPUT_LIMIT_EXCEEDED,
    `Output exceeded maximum allowed size of ${limit} bytes`,
    413,
    { limit }
  );
}

export function invalidInputError(field: string, reason: string): MCPError {
  return new MCPError(
    ErrorCode.INVALID_INPUT,
    `Invalid input for "${field}": ${reason}`,
    400,
    { field, reason }
  );
}

export function rateLimitedError(): MCPError {
  return new MCPError(
    ErrorCode.RATE_LIMITED,
    'Rate limit exceeded. Please wait before retrying.',
    429
  );
}

export function internalError(message: string): MCPError {
  return new MCPError(
    ErrorCode.INTERNAL_ERROR,
    message,
    500
  );
}
