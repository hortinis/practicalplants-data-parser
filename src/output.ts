import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PPPage, ParseError } from './model/types.js';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortKeys(v)]));
  }
  return value;
}
function stable(value: unknown): string { return JSON.stringify(sortKeys(value), null, 2) + '\n'; }
export async function writeOutput(outDir: string, pages: PPPage[], errors: ParseError[], manifest: unknown): Promise<void> {
  for (const page of pages) {
    const dir = join(outDir, 'pages', page.identity.pageType); await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${page.identity.pageId.replace(/\//g,'__')}.json`), stable(page), 'utf8');
  }
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir,'errors.json'), stable(errors), 'utf8');
  await writeFile(join(outDir,'manifest.json'), stable(manifest), 'utf8');
}
