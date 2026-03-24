export type ErrorCategory =
  | 'command-failed'
  | 'file-not-found'
  | 'permission-denied'
  | 'edit-string-not-found'
  | 'write-before-read'
  | 'timeout'
  | 'other';

export interface ToolCall {
  tool: string;
  success: boolean;
  errorMessage?: string;
  errorCategory?: ErrorCategory;
}

export interface SessionData {
  file: string;
  startTime: Date;
  durationMinutes: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  toolCalls: ToolCall[];
  model: string;
}

export interface ProjectData {
  path: string;
  projectCwd?: string;
  name: string;
  claudeMdContent?: string;
  claudeMdPath?: string;
  sessions: SessionData[];
}

export interface Section {
  heading: string;
  level: number;
  startLine: number;
  endLine: number;
  estimatedTokens: number;
}

export interface StaleReference {
  reference: string;
  line: number;
  section: string;
  type: 'file' | 'command';
}

export interface HealthReport {
  project: string;
  claudeMdPath: string;
  totalLines: number;
  estimatedTokens: number;
  sections: Section[];
  staleFileRefs: StaleReference[];
  staleCommandRefs: StaleReference[];
}

export interface Insight {
  rule: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'claudemd' | 'efficiency' | 'failure' | 'workflow';
  file?: string;
  line?: number;
  message: string;
  suggestedFix?: string;
  evidence: Record<string, unknown>;
}

export interface Thresholds {
  claudemdBloatLines: number;
  claudemdBloatTokens: number;
  claudemdThinLines: number;
  toolErrorRatePercent: number;
  toolErrorMinCalls: number;
  falseStartMaxMinutes: number;
  falseStartMaxTokens: number;
  falseStartMinCount: number;
}

export interface RuleContext {
  thresholds: Thresholds;
  resolvePath: (ref: string) => string;
  fileExists: (path: string) => Promise<boolean>;
  readFile: (path: string) => Promise<string | null>;
}

export interface AnalyseOptions {
  claudeDir?: string;
  projects?: ProjectData[];
  thresholds?: Partial<Thresholds>;
}

export interface AnalyseResult {
  insights: Insight[];
  health: HealthReport[];
}

export interface ParseResult {
  projects: ProjectData[];
  parseErrors: number;
}

export type Rule = (project: ProjectData, ctx: RuleContext) => Promise<Insight[]>;
