import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join, basename } from 'path';

const FORGE_DIR = '/data/forge-files';

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { name } = await params;
  const safeName = basename(name);

  if (!safeName.endsWith('.forge')) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  const filePath = join(FORGE_DIR, safeName);

  try {
    await access(filePath);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = await readFile(filePath);
  return new NextResponse(data, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
