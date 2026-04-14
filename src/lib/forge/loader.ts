import { deserializeProject } from 'forge';
import type { ForgeProject } from 'forge';
import type { ForgeGameConfig } from './types';

export interface LoadedForgeFile {
  project: ForgeProject;
  gameConfig: ForgeGameConfig;
}

export async function loadForgeFile(data: ArrayBuffer): Promise<LoadedForgeFile> {
  const project = await deserializeProject(data);

  const gameConfig = extractGameConfig(project);

  return { project, gameConfig };
}

function extractGameConfig(project: ForgeProject): ForgeGameConfig {
  const rawConfig = (project as ForgeProject & { gameConfig?: unknown }).gameConfig;

  if (rawConfig && isForgeGameConfig(rawConfig)) {
    return rawConfig;
  }

  const cardTypeIds = project.cardTypes.map((ct) => ct.id);
  const defaultRoles: Record<string, string> = {};
  for (const id of cardTypeIds) {
    defaultRoles[id] = id;
  }

  return {
    framework: 'generic-card-draw',
    roles: defaultRoles,
  };
}

function isForgeGameConfig(value: unknown): value is ForgeGameConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['framework'] === 'string' &&
    typeof obj['roles'] === 'object' &&
    obj['roles'] !== null
  );
}

export function validateRoles(project: ForgeProject, config: ForgeGameConfig): string[] {
  const errors: string[] = [];
  const cardTypeIds = new Set(project.cardTypes.map((ct) => ct.id));

  for (const [slot, cardTypeId] of Object.entries(config.roles)) {
    if (!cardTypeIds.has(cardTypeId)) {
      errors.push(`Role "${slot}" references missing card type "${cardTypeId}"`);
    }
  }

  return errors;
}
