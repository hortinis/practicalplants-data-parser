import type { CheerioAPI } from 'cheerio';
import type { ConceptPage, IndexPage, UnknownPage } from '../model/types.js';
import { extractLinks } from './links.js';
import { extractReferences } from './references.js';

const base =
  (type: 'concept' | 'index' | 'unknown', pageId: string, sourcePath: string, title: string, repository: string, commit: string | undefined, references: ReturnType<typeof extractReferences>, links: ReturnType<typeof extractLinks>
  ) => ({ identity: { pageId, title, pageType: type, sourcePath }, source: { repository, commit }, references, links });
export function parseConcept($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): ConceptPage {
  const title = $('h1').first().text().trim() || pageId; const body = $('main, #mw-content-text, body').first();
  const members = body.find('a[href]').map((_, a) => $(a).text().trim()).get().filter(Boolean);
  return { ...base('concept', pageId, sourcePath, title, repository, commit, extractReferences($), extractLinks($, sourcePath, pageIds)), concept: { description: body.find('p').first().text().replace(/\s+/g, ' ').trim() || undefined, members: [...new Set(members)].sort() } };
}
export function parseIndex($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): IndexPage {
  const title = $('h1').first().text().trim() || pageId; const body = $('main, #mw-content-text, body').first();
  const members = body.find('a[href]').map((_, a) => $(a).text().trim()).get().filter(Boolean);
  return { ...base('index', pageId, sourcePath, title, repository, commit, extractReferences($), extractLinks($, sourcePath, pageIds)), index: { description: body.find('p').first().text().replace(/\s+/g, ' ').trim() || undefined, members: [...new Set(members)].sort() } };
}
export function parseUnknown($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): UnknownPage {
  const title = $('h1').first().text().trim() || pageId; const text = $('main, #mw-content-text, body').first().text().replace(/\s+/g, ' ').trim();
  return { ...base('unknown', pageId, sourcePath, title, repository, commit, extractReferences($), extractLinks($, sourcePath, pageIds)), unknown: { headings: $('h2,h3').map((_, h) => $(h).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean), text: text || undefined } };
}
