declare module 'forge' {
  export interface ForgeCardType {
    id: string;
    name: string;
    description?: string;
    cardSize: { width: string; height: string };
    fields: ForgeField[];
    frontTemplate: string;
    backTemplate?: string | null;
    css: string;
    colorMapping?: Record<string, { field: string; map: Record<string, string>; default: string; auto?: boolean }> | null;
  }

  export interface ForgeField {
    key: string;
    label: string;
    type: 'text' | 'text-long' | 'richtext' | 'number' | 'select' | 'multi-select' | 'tags' | 'url' | 'image' | 'icon' | 'qr' | 'background' | 'pdf' | 'computed';
    required?: boolean;
    maxLength?: number;
    options?: string[];
    expression?: string;
    separator?: string;
  }

  export interface ForgeRow {
    [key: string]: string | number | string[] | undefined;
    _qty?: number;
    _notes?: string;
    _order?: number;
    _type?: string;
  }

  export interface ForgeAsset {
    data: string;
    type?: string;
    size?: number;
  }

  export interface ForgeProject {
    name: string;
    formatVersion: number;
    cardType: ForgeCardType;
    cardTypes: ForgeCardType[];
    defaultCardType: string;
    data: ForgeRow[];
    globalVariables: Record<string, string>;
    assets: Record<string, ForgeAsset>;
    fonts: Record<string, ForgeAsset>;
    settings?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface RenderDeps {
    globalVariables?: Record<string, string>;
    getAsset?: (name: string) => ForgeAsset | null | undefined;
    hashTagColor?: (value: string) => string;
  }

  export interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  export function deserializeProject(zipData: ArrayBuffer | Blob): Promise<ForgeProject>;
  export function serializeProject(project: ForgeProject): Promise<Blob>;
  export function validateProject(project: ForgeProject): ValidationResult;
  export function renderCard(
    template: string,
    row: ForgeRow,
    fields: ForgeField[],
    cardType: ForgeCardType | null,
    deps?: RenderDeps
  ): string;
  export function scopeCss(css: string, scope: string): string;
  export function preprocessCssAssets(css: string, getAsset?: (name: string) => ForgeAsset | null | undefined): string;
  export function parseCsv(csvText: string): Promise<{ data: ForgeRow[]; errors: unknown[] }>;
  export function generateCsv(fields: ForgeField[], rows: ForgeRow[]): string;
  export function hashTagColor(value: string): string;
  export function preloadIcons(names: string[]): Promise<void>;
  export function getCachedIcon(name: string): string | null;
  export function resolveIconUrl(name: string, fg?: string, bg?: string): string;
  export function generateQrSvg(text: string, options?: unknown): string;
  export function sanitizeTemplate(html: string): string;
  export const CURRENT_FORMAT_VERSION: number;
}
