export interface ForgeGameConfig {
  framework: string;
  roles: Record<string, string>;
  config?: Record<string, unknown>;
}
