import type { CheerioAPI } from 'cheerio';
import type { LinkRecord } from '../model/types.js';
import { normalize } from 'node:path';

function targetFromHref(href: string): string | undefined {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return undefined;
  let target = clean.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?wiki\//, '').replace(/^\.?\/?/, '');
  target = target.replace(/\/index\.html$/i, '').replace(/\.html$/i, '');
  target = normalize(target).replace(/\\/g, '/').replace(/^\.\//, '');
  return target || undefined;
}

export function extractLinks($: CheerioAPI, _sourcePath: string, pageIds: Set<string>): LinkRecord[] {
  const result: LinkRecord[] = [];
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || href.startsWith('#')) return;
    const redLink = $(el).hasClass('new') || /redlink=1/.test(href);
    const internal = href.startsWith('./') || href.startsWith('../') || href.startsWith('/wiki/') || href.startsWith('wiki/') || /^https?:\/\/practicalplants\.org\/(?:wiki|w\/index\.php)/i.test(href);
    if (!internal) { result.push({ href, label, linkType: 'external' }); return; }
    const targetPageId = targetFromHref(href);
    result.push({ href, label, targetPageId, linkType: 'internal', resolved: !!targetPageId && pageIds.has(targetPageId), redLink });
  });
  return result;
}
