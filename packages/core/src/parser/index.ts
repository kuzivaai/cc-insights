import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ParseResult, ProjectData } from '../types.js';
import { parseJsonlContent } from './jsonl.js';
import { aggregateSession } from './sessions.js';

function decodeProjectPath(dirName: string): string {
  // Directory names are URL-encoded path segments joined by hyphens
  // e.g. "-home-user-projects-myapp" → "/home/user/projects/myapp"
  return dirName.split('-').map(segment => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }).join('/');
}

export async function parseClaudeProjects(claudeDir: string): Promise<ParseResult> {
  const projectsDir = join(claudeDir, 'projects');
  let parseErrors = 0;
  const projects: ProjectData[] = [];

  let entries;
  try {
    entries = await readdir(projectsDir, { withFileTypes: true });
  } catch {
    throw new Error(`Cannot read Claude projects directory: ${projectsDir}`);
  }

  const dirs = entries.filter(e => e.isDirectory());

  for (const dir of dirs) {
    const dirPath = join(projectsDir, dir.name);
    const projectCwd = decodeProjectPath(dir.name);
    const name = projectCwd.split('/').filter(Boolean).pop() || dir.name;

    // Read JSONL session files
    let files;
    try {
      files = await readdir(dirPath);
    } catch {
      continue;
    }

    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    const sessions = [];

    for (const file of jsonlFiles) {
      try {
        const content = await readFile(join(dirPath, file), 'utf-8');
        const parsed = parseJsonlContent(content);
        parseErrors += parsed.parseErrors;

        const session = aggregateSession(file, parsed.entries);
        if (session) sessions.push(session);
      } catch {
        // Skip unreadable files
      }
    }

    // Try to read CLAUDE.md from the project working directory
    let claudeMdContent: string | undefined;
    let claudeMdPath: string | undefined;
    try {
      const mdPath = join(projectCwd, 'CLAUDE.md');
      claudeMdContent = await readFile(mdPath, 'utf-8');
      claudeMdPath = mdPath;
    } catch {
      // No CLAUDE.md
    }

    projects.push({
      path: dirPath,
      projectCwd,
      name,
      claudeMdContent,
      claudeMdPath,
      sessions,
    });
  }

  return { projects, parseErrors };
}
