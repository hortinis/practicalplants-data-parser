import type { CheerioAPI } from 'cheerio';
import type { PageType } from './model/types.js';
import { cleanText } from './normalize/values.js';
import { normalizeLinkTarget } from './parser/links.js';

export type CollectionKind = 'family' | 'genus' | 'use' | 'category' | 'catalog' | 'unknown';
export function collectionKind($: CheerioAPI, sourcePath = '', pageIds: Set<string> = new Set()): CollectionKind | undefined {
  const body = $('#mw-content-text').first();
  if (!body.length) return undefined;
  const heading = body.find('h2, h3').map((_, h) => {
    const text = cleanText($(h).text());
    return /^(?:Plants (?:in|with|which|that)|Members of this family|Pages (?:using|in)|List of |A-Z of )/i.test(text) ? text : '';
  }).get().find(Boolean);
  if (!heading) return undefined;
  const hasMembers = body.find('li a[href]').toArray().some(a => {
    const href = $(a).attr('href') || ''; const target = normalizeLinkTarget(href, sourcePath);
    return pageIds.size ? !!target && pageIds.has(target) : /(?:^|\/)wiki\/[^/?#]+(?:\/index\.html)?(?:[#?].*)?$/i.test(href) || /(?:^|\?)title=[^&]+/i.test(href);
  });
  if (!hasMembers) return undefined;
  if (/^Members of this family/i.test(heading)) return 'family';
  if (/^Plants in the .+ genus/i.test(heading)) return 'genus';
  if (/^Plants with parts able to be used as/i.test(heading)) return 'use';
  if (/^Pages in category/i.test(heading)) return 'category';
  if (/^A-Z of/i.test(heading)) return 'catalog';
  return 'unknown';
}

export function classifyPage($: CheerioAPI, sourcePath = '', pageIds: Set<string> = new Set()): PageType {
  if ($('#plant-datatable').length || $('.plant-name .binomial').length && $('#page-header.with-image').length) return 'plant';
  const summary = cleanText($('#article-summary').first().text());
  if (/^is a .*common name.* for /i.test(summary) && $('#article-summary a[href]').length) return 'alias';

  const title = cleanText($('#article-title').first().text());
  const headings = $('h2, h3').map((_, h) => cleanText($(h).text())).get();
  const categories = cleanText($('#catlinks').first().text()).toLowerCase();

  if (headings.some(h => /^Plants inhabiting this ecosystem niche$/i.test(h)) || /ecosystem niche/i.test(categories) && title) return 'concept';
  const kind = collectionKind($, sourcePath, pageIds);
  if (kind) return kind === 'genus' || kind === 'unknown' ? 'index' : 'collection';
  return 'unknown';
}
