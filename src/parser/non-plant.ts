import type { CheerioAPI } from 'cheerio';
import type { AliasPage, CollectionPage, ConceptPage, DocumentationPage, IndexPage, UnknownPage } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { normalizeLinkTarget } from './links.js';
import { extractLinks } from './links.js';
import { extractReferences } from './references.js';

function pageIdentity<T extends 'concept' | 'index' | 'unknown'>(pageId: string, title: string, pageType: T, sourcePath: string): { pageId: string; title: string; pageType: T; sourcePath: string } {
  return { pageId, title, pageType, sourcePath };
}

export function parseAlias($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): AliasPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const summary = cleanText($('#article-summary').first().text()) || undefined;
  const targets = $('#article-summary a[href], #mw-content-text > a[href]').map((_, a) => normalizeLinkTarget($(a).attr('href') || '', sourcePath)).get().filter((x): x is string => !!x && pageIds.has(x));
  return { identity: { pageId, title, pageType: 'alias', sourcePath }, source: { repository, commit }, references: extractReferences($), links: extractLinks($, sourcePath, pageIds), alias: { kind: 'common_name', description: summary, targets: [...new Set(targets)].sort() } };
}

export function parseCollection($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>, kind: CollectionPage['collection']['kind']): CollectionPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const body = $('#mw-content-text').first();
  const members = body.find('li a[href]').map((_, a) => normalizeLinkTarget($(a).attr('href') || '', sourcePath)).get().filter((x): x is string => !!x && x !== pageId && pageIds.has(x));
  const uniqueMembers = [...new Set(members)].sort();
  return { identity: { pageId, title, pageType: 'collection', sourcePath }, source: { repository, commit }, references: extractReferences($), links: extractLinks($, sourcePath, pageIds), collection: { kind, description: cleanText($('#article-summary').first().text()) || undefined, members: uniqueMembers, completeness: uniqueMembers.length ? 'populated' : 'empty' } };
}

export function parseDocumentation($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): DocumentationPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const body = $('#mw-content-text').first();
  const namespace = pageId.includes(':') ? pageId.split(':', 1)[0] : undefined;
  return { identity: { pageId, title, pageType: 'documentation', sourcePath }, source: { repository, commit }, references: extractReferences($), links: extractLinks($, sourcePath, pageIds), documentation: { namespace, headings: $('h2,h3').map((_, h) => cleanText($(h).text())).get().filter(Boolean), text: cleanText(body.text()) || undefined } };
}

export function parseConcept($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): ConceptPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const body = $('#mw-content-text').first();
  const members = body.find('h2 + div a[href], li a[href]')
    .map((_, a) => normalizeLinkTarget($(a).attr('href') || '', sourcePath))
    .get()
    .filter((x): x is string => !!x && pageIds.has(x));
  return {
    identity: pageIdentity(pageId, title, 'concept', sourcePath),
    source: { repository, commit },
    references: extractReferences($),
    links: extractLinks($, sourcePath, pageIds),
    concept: { description: cleanText($('#article-summary').first().text()) || undefined, members: [...new Set(members)].sort() }
  };
}

export function parseIndex($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): IndexPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const body = $('#mw-content-text').first();
  const members = body.find('li a[href]').not('.printfooter a, #catlinks a')
    .map((_, a) => normalizeLinkTarget($(a).attr('href') || '', sourcePath))
    .get()
    .filter((x): x is string => !!x && x !== pageId && pageIds.has(x));
  return {
    identity: pageIdentity(pageId, title, 'index', sourcePath),
    source: { repository, commit },
    references: extractReferences($),
    links: extractLinks($, sourcePath, pageIds),
    index: { description: cleanText(body.find('h2').first().text()) || undefined, members: [...new Set(members)].sort() }
  };
}

export function parseUnknown($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): UnknownPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const body = $('#mw-content-text').first();
  return {
    identity: pageIdentity(pageId, title, 'unknown', sourcePath),
    source: { repository, commit },
    references: extractReferences($),
    links: extractLinks($, sourcePath, pageIds),
    unknown: { headings: $('h2,h3').map((_, h) => cleanText($(h).text())).get().filter(Boolean), text: cleanText(body.text()) || undefined }
  };
}
