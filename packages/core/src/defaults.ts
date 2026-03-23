import type { Thresholds } from './types.js';

export const DEFAULT_THRESHOLDS: Thresholds = {
  claudemdBloatLines: 300,
  claudemdBloatTokens: 1800,
  claudemdThinLines: 10,
  toolErrorRatePercent: 10,
  toolErrorMinCalls: 10,
  falseStartMaxMinutes: 2,
  falseStartMaxTokens: 500,
  falseStartMinCount: 3,
};
