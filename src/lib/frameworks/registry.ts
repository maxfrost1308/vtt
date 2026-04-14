import type { GameFramework } from './types';

const g = globalThis as unknown as { __vttFrameworks?: Map<string, GameFramework> };
if (!g.__vttFrameworks) g.__vttFrameworks = new Map();
const registry = g.__vttFrameworks;

export function registerFramework(framework: GameFramework): void {
  registry.set(framework.id, framework);
}

export function getFramework(id: string): GameFramework | undefined {
  return registry.get(id);
}

export function listFrameworks(): GameFramework[] {
  return Array.from(registry.values());
}
