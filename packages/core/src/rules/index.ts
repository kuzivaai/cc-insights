import type { Rule } from '../types.js';
import { staleFileRef } from './stale-file-ref.js';
import { staleCommandRef } from './stale-command-ref.js';
import { claudemdBloat } from './claudemd-bloat.js';
import { missingClaudeMd } from './missing-claudemd.js';
import { thinClaudeMd } from './thin-claudemd.js';
import { missingBuildCmd } from './missing-build-cmd.js';
import { toolErrorPattern } from './tool-error-pattern.js';
import { falseStarts } from './false-starts.js';
import { fillerPhrase } from './filler-phrase.js';
import { staleImport } from './stale-import.js';
import { noStructure } from './no-structure.js';
import { redundantConfig } from './redundant-config.js';

export const ALL_RULES: Rule[] = [
  staleFileRef,
  staleCommandRef,
  claudemdBloat,
  missingClaudeMd,
  thinClaudeMd,
  missingBuildCmd,
  toolErrorPattern,
  falseStarts,
  fillerPhrase,
  staleImport,
  noStructure,
  redundantConfig,
];
