import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { scanSource } from './scanner.js';
import { classifyPage, collectionKind } from './classifier.js';
import { parsePlant } from './parser/plant.js';
import { parseAlias, parseCollection, parseConcept, parseDocumentation, parseIndex, parseUnknown } from './parser/non-plant.js';
import { parsePolyculture } from './parser/polyculture.js';
import { parseInteraction } from './parser/interaction.js';
import { validatePage } from './validate.js';
import { writeOutput } from './output.js';
import { recoverEmptyUseCollections } from './recovery/use-collections.js';
import { downloadPrimaryImages } from './recovery/images.js';
import { recoverCategoryCollections } from './recovery/category-collections.js';
import { extractSemanticFacts } from './parser/semantic-facts.js';
import { extractSourceMetadata } from './parser/source-metadata.js';
import type { CollectionPage, PPPage, ParseError } from './model/types.js';

const args = process.argv.slice(2); const source = args[0]; const outIndex = args.indexOf('--output'); const output = outIndex >= 0 ? args[outIndex + 1] : './output'; const shouldDownloadImages = args.includes('--download-images');
if (!source || !output) { console.error('Usage: npm run parse -- <archive-path> --output <output-path> [--download-images]'); process.exit(2); }
const scan = scanSource(source); const pageIds = new Set(scan.pages.map(p => p.pageId)); const pages: PPPage[] = []; const errors: ParseError[] = [];
for (const candidate of scan.pages) {
  try {
    const html = await readFile(candidate.absolutePath, 'utf8'); const $ = load(html); const type = classifyPage($, candidate.sourcePath, pageIds); const common = [candidate.pageId,candidate.sourcePath,'Practical Plants recovered archive',scan.commit,pageIds] as const;
    const semanticFacts = extractSemanticFacts($, candidate.sourcePath, pageIds);
    const sourceMetadata = extractSourceMetadata($);
    const page = type === 'plant' ? parsePlant($, ...common, semanticFacts) : type === 'alias' ? parseAlias($, ...common) : type === 'collection' ? parseCollection($, ...common, collectionKind($, candidate.sourcePath, pageIds) || 'unknown') : type === 'concept' ? parseConcept($, ...common) : type === 'polyculture' ? parsePolyculture($, ...common) : type === 'interaction' ? parseInteraction($, ...common) : type === 'index' ? parseIndex($, ...common) : type === 'documentation' ? parseDocumentation($, ...common) : parseUnknown($, ...common);
    if (Object.keys(sourceMetadata).length) page.source.mediaWiki = sourceMetadata;
    if (semanticFacts.length && type !== 'plant') page.semanticFacts = semanticFacts;
    validatePage(page); pages.push(page);
  } catch (error) { errors.push({ sourcePath: candidate.sourcePath, error: error instanceof Error ? error.message : String(error), severity: 'error' }); }
}
const collectionRecovery = recoverEmptyUseCollections(pages);
const categoryRecovery = recoverCategoryCollections(pages);
const imageRecovery = shouldDownloadImages ? await downloadPrimaryImages(pages, output) : undefined;
pages.sort((a,b) => a.identity.pageId.localeCompare(b.identity.pageId)); errors.sort((a,b) => a.sourcePath.localeCompare(b.sourcePath));
const counts = pages.reduce<Record<string,number>>((acc,p) => { acc[p.identity.pageType]=(acc[p.identity.pageType]||0)+1; return acc; },{});
const collectionPages = pages.filter((p): p is CollectionPage => p.identity.pageType === 'collection');
const collectionCounts = collectionPages.reduce<Record<string, number>>((acc, p) => { const key = `${p.collection.kind}.${p.collection.completeness}`; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
const sourceMetadataCounts = pages.reduce<Record<string, number>>((acc, page) => {
  if (page.source.mediaWiki?.revision) acc.revisions = (acc.revisions || 0) + 1;
  if (page.source.mediaWiki?.lastModified) acc.lastModified = (acc.lastModified || 0) + 1;
  if (page.source.mediaWiki?.historicalAccessCount !== undefined) acc.historicalAccessCounts = (acc.historicalAccessCounts || 0) + 1;
  return acc;
}, {});
await writeOutput(output,pages,errors,{ parserVersion:'0.14.0', sourceRepository:'Practical Plants recovered archive', sourceCommit:scan.commit, schemaVersion:'0.14.0', pageCounts:counts, collectionCounts, collectionRecovery, categoryRecovery, sourceMetadataCounts, ...(imageRecovery ? { imageRecovery } : {}), pageCount:pages.length, errorCount:errors.length });
console.log(`Parsed ${pages.length} pages with ${errors.length} errors.`);
