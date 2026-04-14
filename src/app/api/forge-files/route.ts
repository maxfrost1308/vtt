import { NextResponse } from 'next/server';
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import type { ForgeGameConfig } from '@/lib/forge/types';

const FORGE_DIR = '/data/forge-files';

export interface ForgeFileEntry {
  name: string;
  size: number;
  config: ForgeGameConfig | null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const entries = await readdir(FORGE_DIR);
    const forgeFiles: ForgeFileEntry[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.forge')) continue;
      const info = await stat(join(FORGE_DIR, entry));

      let config: ForgeGameConfig | null = null;
      const configPath = join(FORGE_DIR, entry.replace(/\.forge$/, '.json'));
      try {
        const raw = await readFile(configPath, 'utf-8');
        config = JSON.parse(raw) as ForgeGameConfig;
      } catch {
      }

      forgeFiles.push({ name: entry, size: info.size, config });
    }

    return NextResponse.json(forgeFiles);
  } catch {
    return NextResponse.json([]);
  }
}
