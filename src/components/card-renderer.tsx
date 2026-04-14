'use client';

import { useMemo } from 'react';
import { renderCard, scopeCss } from 'forge';
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
  const cardType = project.cardTypes.find((ct) => ct.id === cardTypeId);

  const { html, css } = useMemo(() => {
    if (!cardType) return { html: '', css: '' };

    const getAsset = (name: string) => project.assets[name] ?? null;

    const renderedHtml = renderCard(
      cardType.frontTemplate,
      row,
      cardType.fields,
      cardType,
      {
        globalVariables: project.globalVariables,
        getAsset,
      }
    );

    const scopedCss = scopeCss(cardType.css, cardType.id);

    return { html: renderedHtml, css: scopedCss };
  }, [cardType, row, project]);

  if (!cardType) return null;

  const { width, height } = cardType.cardSize;

  return (
    <div
      className={`card-type-${cardType.id}`}
      style={{ width, height, position: 'relative', overflow: 'hidden' }}
    >
      <style>{css}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function CardBack({ forgeProject, cardTypeId }: CardBackProps) {
  const cardType = forgeProject.cardTypes.find((ct) => ct.id === cardTypeId);

  const rendered = useMemo(() => {
    if (!cardType?.backTemplate) return null;

    const getAsset = (name: string) => forgeProject.assets[name] ?? null;

    const html = renderCard(
      cardType.backTemplate,
      {} as ForgeRow,
      cardType.fields,
      cardType,
      {
        globalVariables: forgeProject.globalVariables,
        getAsset,
      }
    );

    const css = scopeCss(cardType.css, cardType.id);

    return { html, css };
  }, [cardType, forgeProject]);

  if (!cardType) return null;

  const { width, height } = cardType.cardSize;

  if (rendered) {
    return (
      <div
        className={`card-type-${cardType.id}`}
        style={{ width, height, position: 'relative', overflow: 'hidden', background: '#27272a' }}
      >
        <style>{rendered.css}</style>
        <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
      </div>
    );
  }

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
