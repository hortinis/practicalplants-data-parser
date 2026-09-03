import type { CheerioAPI } from 'cheerio';
import type { LinkRecord } from '../model/types.js';
import { basename, dirname, extname, normalize, relative } from 'node:path';

export function extractLinks($: CheerioAPI, sourcePath: string, pageIds: Set<string>): LinkRecord[] {
  const result: LinkRecord[] = [];
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href) return;
    const internal = href.startsWith('./') || href.startsWith('../') || href.startsWith('/wiki/') || href.startsWith('wiki/');
    if (!internal) { result.push({ href, label, linkType: href.startsWith('#') ? 'unknown' : 'external' }); return; }
    const cleaned = href.split('#')[0].split('?')[0];
    let target = cleaned.replace(/^\/?wiki\//, '').replace(/\/index\.html$/i, '').replace(/\.html$/i, '');
    if (!target) return;
    target = normalize(target).replace(/^\.\//, '').replace(/\\/g, '/');
    const targetPageId = target || undefined;
    result.push({ href, label, targetPageId, linkType: 'internal', resolved: !!targetPageId && pageIds.has(targetPageId) });
  });
  return result;
}
