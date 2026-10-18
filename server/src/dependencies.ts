import type { AppConfig } from './infrastructure/config.ts';
import type { TtlCache } from './infrastructure/cache.ts';

export interface Dependencies {
  config: AppConfig;
  cache: TtlCache;
  rootDir: string;
}
