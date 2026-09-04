import type { CheerioAPI } from 'cheerio';
import type { PageType } from './model/types.js';
import { cleanText } from './normalize/values.js';

export type CollectionKind = 'family' | 'genus' | 'use' | 'category' | 'catalog' | 'unknown';
export function collectionKind($: CheerioAPI, sourcePath = '', pageIds: Set<string> = new Set()): CollectionKind | undefined {
  const body = $('#mw-content-text').first();
  if (!body.length) return undefined;
  const heading = body.find('h2, h3').map((_, h) => {
    const text = cleanText($(h).text());
    return /^(?:Plants (?:in|with|which|that)|Members of this family|Pages (?:using|in)|List of |A-Z of |Plants this animal uses for forage|[A-Z][A-Za-z -]+ with (?:edible|material|medicinal) uses)/i.test(text) ? text : '';
  }).get().find(Boolean);
  if (!heading) return undefined;
  if (/^Members of this family/i.test(heading)) return 'family';
  if (/^Plants in the .+ genus/i.test(heading)) return 'genus';
  if (/^Plants with parts able to be used as|^Plants this animal uses for forage|^[A-Z][A-Za-z -]+ with (?:edible|material|medicinal) uses/i.test(heading)) return 'use';
  if (/^Pages in category/i.test(heading)) return 'category';
  if (/^A-Z of/i.test(heading)) return 'catalog';
  return 'unknown';
}

export function classifyPage($: CheerioAPI, sourcePath = '', pageIds: Set<string> = new Set()): PageType {
  if ($('#plant-datatable').length || $('.plant-name .binomial').length && $('#page-header.with-image').length) return 'plant';
  const summary = cleanText($('#article-summary').first().text());
  if (/^is a .*common name.* for /i.test(summary) && $('#article-summary a[href]').length) return 'alias';

  const title = cleanText($('#article-title').first().text());
  const pageId = sourcePath.replace(/^wiki\//i, '').replace(/\/index\.html$/i, '');
  if (/^(?:Help|Template|Category|Concept|Form|Property|Talk|User|MediaWiki|PracticalPlants):/i.test(pageId) || /^(?:Search|Wiki|Todos|Transitioning_PFAF)$/i.test(pageId)) return 'documentation';
  const headings = $('h2, h3').map((_, h) => cleanText($(h).text())).get();
  const categories = cleanText($('#catlinks').first().text()).toLowerCase();

  if (headings.some(h => /^Plants inhabiting this ecosystem niche$/i.test(h)) || /ecosystem niche/i.test(categories) && title) return 'concept';
  const kind = collectionKind($, sourcePath, pageIds);
  if (kind) return kind === 'genus' || kind === 'unknown' ? 'index' : 'collection';
  return 'unknown';
}
