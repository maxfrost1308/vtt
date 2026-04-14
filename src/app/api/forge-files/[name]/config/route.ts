import { NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'fs/promises';
import { join, basename } from 'path';
import { createClient } from '@/lib/supabase/server';
import type { ForgeGameConfig } from '@/lib/forge/types';

const FORGE_DIR = '/data/forge-files';
const ADMIN_IDS = (process.env.VTT_ADMIN_USER_IDS ?? '').split(',').filter(Boolean);

interface RouteParams {
  params: Promise<{ name: string }>;
}

function configPathFor(forgeName: string): string {
  return join(FORGE_DIR, basename(forgeName).replace(/\.forge$/, '.json'));
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { name } = await params;
  const configPath = configPathFor(name);

  try {
    const raw = await readFile(configPath, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name } = await params;
  const safeName = basename(name);

  if (!safeName.endsWith('.forge')) {
    return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
  }

  try {
    await access(join(FORGE_DIR, safeName));
  } catch {
    return NextResponse.json({ error: 'Forge file not found' }, { status: 404 });
  }

  let config: ForgeGameConfig;
  try {
    config = (await request.json()) as ForgeGameConfig;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!config.framework || typeof config.framework !== 'string') {
    return NextResponse.json({ error: 'Missing framework' }, { status: 400 });
  }

  if (!config.roles || typeof config.roles !== 'object') {
    return NextResponse.json({ error: 'Missing roles' }, { status: 400 });
  }

  await writeFile(configPathFor(safeName), JSON.stringify(config, null, 2), 'utf-8');
  return NextResponse.json({ saved: true });
}
