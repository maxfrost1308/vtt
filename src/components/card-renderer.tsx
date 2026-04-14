'use client';

import { useMemo } from 'react';
import { renderFullCard } from 'forge';
import type { ForgeProject, ForgeRow } from 'forge';

interface CardRendererProps {
  project: ForgeProject;
  cardTypeId: string;
  row: ForgeRow;
}

interface CardBackProps {
  forgeProject: ForgeProject;
  cardTypeId: string;
}

export function CardRenderer({ project, cardTypeId, row }: CardRendererProps) {
  const rendered = useMemo(
    () => renderFullCard(project, cardTypeId, row),
    [project, cardTypeId, row]
  );

  if (!rendered) return null;

  return (
    <div
      data-card-type={rendered.cardTypeId}
      style={{ width: rendered.width, height: rendered.height, position: 'relative', overflow: 'hidden' }}
    >
      <style>{rendered.css}</style>
      <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: rendered.html }} />
    </div>
  );
}

export function CardBack({ forgeProject, cardTypeId }: CardBackProps) {
  const rendered = useMemo(
    () => renderFullCard(forgeProject, cardTypeId, {} as ForgeRow, { side: 'back' }),
    [forgeProject, cardTypeId]
  );

  if (!rendered) {
    const cardType = forgeProject.cardTypes.find((ct) => ct.id === cardTypeId);
    if (!cardType) return null;
    const { width, height } = cardType.cardSize;

    return (
      <div
        className="bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center relative overflow-hidden"
        style={{ width, height }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)',
          }}
        />
        <div className="text-center px-4 relative">
          <div className="text-zinc-500 text-sm font-medium tracking-wide">
            {forgeProject.name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-card-type={rendered.cardTypeId}
      style={{ width: rendered.width, height: rendered.height, position: 'relative', overflow: 'hidden' }}
    >
      <style>{rendered.css}</style>
      <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: rendered.html }} />
    </div>
  );
}
