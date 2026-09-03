import type { CheerioAPI } from 'cheerio';
import type { ConceptPage, IndexPage, UnknownPage } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { extractLinks } from './links.js';
import { extractReferences } from './references.js';

function pageIdentity<T extends 'concept' | 'index' | 'unknown'>(pageId: string, title: string, pageType: T, sourcePath: string): { pageId: string; title: string; pageType: T; sourcePath: string } {
  return { pageId, title, pageType, sourcePath };
}

export function parseConcept($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): ConceptPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const body = $('#mw-content-text').first();
  const members = body.find('h2 + div a[href], li a[href]')
    .map((_, a) => cleanText($(a).attr('href') || ''))
    .get()
    .map(h => h.replace(/^\/?wiki\//, '').replace(/\/index\.html$/, '').replace(/^\//, ''))
    .filter(x => x && !x.startsWith('Special:'));
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
  const members = body.find('.category-plant-item a[href]')
    .map((_, a) => cleanText($(a).attr('href') || ''))
    .get()
    .map(h => h.replace(/^\.?\/?wiki\//, '').replace(/\/index\.html$/, ''))
    .filter(Boolean);
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
