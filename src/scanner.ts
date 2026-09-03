import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface SourcePageCandidate { pageId: string; sourcePath: string; absolutePath: string; }
export interface ScanResult { root: string; wikiRoot: string; pages: SourcePageCandidate[]; commit?: string; }

export function scanSource(root: string): ScanResult {
  const absoluteRoot = root.replace(/[\\/]$/, '');
  const wikiRoot = join(absoluteRoot, 'wiki');
  if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) throw new Error(`Source directory does not exist: ${root}`);
  if (!existsSync(wikiRoot) || !statSync(wikiRoot).isDirectory()) throw new Error(`Expected wiki/ directory not found: ${wikiRoot}`);
  const pages: SourcePageCandidate[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') {
        const rel = relative(absoluteRoot, full).split(sep).join('/');
        const relWiki = relative(wikiRoot, full).split(sep).join('/');
        const pageId = relWiki.replace(/\\/g, '/').replace(/\\/g, '/').replace(/\/index\.html$/i, '');
        pages.push({ pageId, sourcePath: rel, absolutePath: full });
      }
    }
  };
  walk(wikiRoot);
  pages.sort((a,b) => a.pageId.localeCompare(b.pageId));
  let commit: string | undefined;
  try { commit = execFileSync('git', ['-C', absoluteRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim() || undefined; } catch { /* not a git checkout */ }
  return { root: absoluteRoot, wikiRoot, pages, commit };
}
