'use client';

import { useMemo } from 'react';
import { renderCard, scopeCss } from 'forge';
import type { ForgeProject, ForgeRow } from 'forge';

interface CardRendererProps {
  project: ForgeProject;
  cardTypeId: string;
  row: ForgeRow;
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
