import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RuleContext, Thresholds } from './types.js';

export function createDefaultContext(projectCwd: string, thresholds: Thresholds): RuleContext {
  return {
    thresholds,
    resolvePath: (ref: string) => resolve(join(projectCwd, ref)),
    fileExists: async (path: string) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
    readFile: async (path: string) => {
      try {
        return await readFile(path, 'utf-8');
      } catch {
        return null;
      }
    },
  };
}
