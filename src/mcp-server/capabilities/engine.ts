import type { Target } from '../config/schema.js';
import { capabilityDeniedError } from '../errors/index.js';

// Capability definitions
export const CAPABILITIES = {
  // Read capabilities
  HOST_READ: 'host.read',
  DOCKER_READ: 'docker.read',
  DOCKER_LOGS: 'docker.logs',
  DOCKER_INSPECT_SAFE: 'docker.inspect.safe',
  SYSTEMD_READ: 'systemd.read',
  FILESYSTEM_LIST: 'filesystem.list',
  FILESYSTEM_READ: 'filesystem.read.allowed',
  GIT_READ: 'git.read',
  VERIFIER_RUN: 'verifier.run',
  
  // Write capabilities (V2)
  SERVICE_RESTART: 'service.restart.allowed',
  DOCKER_RESTART: 'docker.restart',
  DEPLOY_CONTROLLED: 'deploy.controlled',
} as const;

export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES];

// Capability profiles
export const PROFILES: Record<string, Capability[]> = {
  'read-only': [
    CAPABILITIES.HOST_READ,
    CAPABILITIES.DOCKER_READ,
    CAPABILITIES.GIT_READ,
    CAPABILITIES.FILESYSTEM_LIST,
    CAPABILITIES.FILESYSTEM_READ,
  ],
  'prod-read-mostly': [
    CAPABILITIES.HOST_READ,
    CAPABILITIES.DOCKER_READ,
    CAPABILITIES.DOCKER_LOGS,
    CAPABILITIES.DOCKER_INSPECT_SAFE,
    CAPABILITIES.SYSTEMD_READ,
    CAPABILITIES.FILESYSTEM_LIST,
    CAPABILITIES.FILESYSTEM_READ,
    CAPABILITIES.GIT_READ,
    CAPABILITIES.VERIFIER_RUN,
  ],
  'staging-operator': [
    CAPABILITIES.HOST_READ,
    CAPABILITIES.DOCKER_READ,
    CAPABILITIES.DOCKER_LOGS,
    CAPABILITIES.DOCKER_INSPECT_SAFE,
    CAPABILITIES.SYSTEMD_READ,
    CAPABILITIES.FILESYSTEM_LIST,
    CAPABILITIES.FILESYSTEM_READ,
    CAPABILITIES.GIT_READ,
    CAPABILITIES.VERIFIER_RUN,
    CAPABILITIES.SERVICE_RESTART,
    CAPABILITIES.DOCKER_RESTART,
  ],
  'deployment-operator': [
    CAPABILITIES.HOST_READ,
    CAPABILITIES.DOCKER_READ,
    CAPABILITIES.DOCKER_LOGS,
    CAPABILITIES.DOCKER_INSPECT_SAFE,
    CAPABILITIES.SYSTEMD_READ,
    CAPABILITIES.FILESYSTEM_LIST,
    CAPABILITIES.FILESYSTEM_READ,
    CAPABILITIES.GIT_READ,
    CAPABILITIES.VERIFIER_RUN,
    CAPABILITIES.SERVICE_RESTART,
    CAPABILITIES.DOCKER_RESTART,
    CAPABILITIES.DEPLOY_CONTROLLED,
  ],
};

export interface CapabilityEngine {
  checkCapability(target: Target, capability: Capability): void;
  getCapabilities(target: Target): Capability[];
}

/**
 * Creates a capability engine that checks if a target has a specific capability
 * based on its capability profile
 */
export function createCapabilityEngine(): CapabilityEngine {
  return {
    checkCapability(target: Target, capability: Capability): void {
      const profile = PROFILES[target.capabilityProfile];
      
      if (!profile) {
        throw capabilityDeniedError(capability, target.id);
      }

      if (!profile.includes(capability)) {
        throw capabilityDeniedError(capability, target.id);
      }
    },

    getCapabilities(target: Target): Capability[] {
      const profile = PROFILES[target.capabilityProfile];
      return profile || [];
    },
  };
}
