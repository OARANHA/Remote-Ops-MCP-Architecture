import type { Target, Config } from '../config/schema.js';
import { targetNotFoundError, targetDisabledError } from '../errors/index.js';
import { validateTargetId } from '../security/paths.js';

export interface TargetRegistry {
  getTarget(targetId: string): Target;
  listTargets(): Target[];
  hasTarget(targetId: string): boolean;
}

/**
 * Creates a target registry from configuration
 * The registry is the source of truth for all target information
 * LLMs can only provide target IDs, not connection details
 */
export function createTargetRegistry(config: Config): TargetRegistry {
  const targets = new Map<string, Target>();

  // Load targets from config
  for (const [id, targetConfig] of Object.entries(config.targets)) {
    const target: Target = {
      ...targetConfig,
      id, // Ensure ID matches the key
    };
    targets.set(id, target);
  }

  return {
    getTarget(targetId: string): Target {
      // Validate target ID format
      if (!validateTargetId(targetId)) {
        throw targetNotFoundError(targetId);
      }

      const target = targets.get(targetId);
      if (!target) {
        throw targetNotFoundError(targetId);
      }

      if (target.disabled) {
        throw targetDisabledError(targetId);
      }

      return target;
    },

    listTargets(): Target[] {
      return Array.from(targets.values());
    },

    hasTarget(targetId: string): boolean {
      return targets.has(targetId);
    },
  };
}
