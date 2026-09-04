import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { scanSource } from './scanner.js';
import { classifyPage, collectionKind } from './classifier.js';
import { parsePlant } from './parser/plant.js';
import { parseAlias, parseCollection, parseConcept, parseIndex, parseUnknown } from './parser/non-plant.js';
import { validatePage } from './validate.js';
import { writeOutput } from './output.js';
import type { PPPage, ParseError } from './model/types.js';

const args = process.argv.slice(2); const source = args[0]; const outIndex = args.indexOf('--output'); const output = outIndex >= 0 ? args[outIndex + 1] : './output';
if (!source || !output) { console.error('Usage: npm run parse -- <archive-path> --output <output-path>'); process.exit(2); }
const scan = scanSource(source); const pageIds = new Set(scan.pages.map(p => p.pageId)); const pages: PPPage[] = []; const errors: ParseError[] = [];
for (const candidate of scan.pages) {
  try {
    const html = await readFile(candidate.absolutePath, 'utf8'); const $ = load(html); const type = classifyPage($, candidate.sourcePath, pageIds); const common = [candidate.pageId,candidate.sourcePath,'Practical Plants recovered archive',scan.commit,pageIds] as const;
    const page = type === 'plant' ? parsePlant($, ...common) : type === 'alias' ? parseAlias($, ...common) : type === 'collection' ? parseCollection($, ...common, collectionKind($, candidate.sourcePath, pageIds) || 'unknown') : type === 'concept' ? parseConcept($, ...common) : type === 'index' ? parseIndex($, ...common) : parseUnknown($, ...common);
    validatePage(page); pages.push(page);
  } catch (error) { errors.push({ sourcePath: candidate.sourcePath, error: error instanceof Error ? error.message : String(error), severity: 'error' }); }
}
pages.sort((a,b) => a.identity.pageId.localeCompare(b.identity.pageId)); errors.sort((a,b) => a.sourcePath.localeCompare(b.sourcePath));
const counts = pages.reduce<Record<string,number>>((acc,p) => { acc[p.identity.pageType]=(acc[p.identity.pageType]||0)+1; return acc; },{});
await writeOutput(output,pages,errors,{ parserVersion:'0.4.0', sourceRepository:'Practical Plants recovered archive', sourceCommit:scan.commit, schemaVersion:'0.4.0', pageCounts:counts, pageCount:pages.length, errorCount:errors.length });
console.log(`Parsed ${pages.length} pages with ${errors.length} errors.`);
