'use client';

import { useMemo } from 'react';
import { renderCard, scopeCss, preprocessCssAssets } from 'forge';
import type { ForgeProject, ForgeAsset, ForgeRow } from 'forge';

interface CardRendererProps {
  project: ForgeProject;
  cardTypeId: string;
  row: ForgeRow;
}

interface CardBackProps {
  forgeProject: ForgeProject;
  cardTypeId: string;
}

function buildGetAsset(project: ForgeProject) {
  return (name: string): ForgeAsset | null =>
    project.assets[name] ?? project.fonts[name] ?? null;
}

function buildFontFaceCss(project: ForgeProject): string {
  const entries = Object.values(project.fonts);
  if (entries.length === 0) return '';
  return entries
    .filter((f) => f.family && f.data)
    .map((f) => `@font-face{font-family:"${f.family}";src:url(${f.data})}`)
    .join('');
}

function buildCss(project: ForgeProject, cardTypeId: string, getAsset: ReturnType<typeof buildGetAsset>) {
  const cardType = project.cardTypes.find((ct) => ct.id === cardTypeId);
  if (!cardType) return '';
  const fontCss = buildFontFaceCss(project);
  const cardCss = scopeCss(preprocessCssAssets(cardType.css, getAsset), cardTypeId);
  return fontCss + cardCss;
}

export function CardRenderer({ project, cardTypeId, row }: CardRendererProps) {
  const cardType = project.cardTypes.find((ct) => ct.id === cardTypeId);

  const { html, css } = useMemo(() => {
    if (!cardType) return { html: '', css: '' };

    const getAsset = buildGetAsset(project);

    const renderedHtml = renderCard(
      cardType.frontTemplate,
      row,
      cardType.fields,
      cardType,
      { globalVariables: project.globalVariables, getAsset }
    );

    return { html: renderedHtml, css: buildCss(project, cardTypeId, getAsset) };
  }, [cardType, row, project, cardTypeId]);

  if (!cardType) return null;

  const { width, height } = cardType.cardSize;

  return (
    <div
      data-card-type={cardType.id}
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

    const getAsset = buildGetAsset(forgeProject);

    const html = renderCard(
      cardType.backTemplate,
      {} as ForgeRow,
      cardType.fields,
      cardType,
      { globalVariables: forgeProject.globalVariables, getAsset }
    );

    return { html, css: buildCss(forgeProject, cardTypeId, getAsset) };
  }, [cardType, forgeProject, cardTypeId]);

  if (!cardType) return null;

  const { width, height } = cardType.cardSize;

  if (rendered) {
    return (
      <div
        data-card-type={cardType.id}
        style={{ width, height, position: 'relative', overflow: 'hidden' }}
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
