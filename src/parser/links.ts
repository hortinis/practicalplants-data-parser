import type { CheerioAPI } from 'cheerio';
import type { LinkRecord } from '../model/types.js';
import { normalize } from 'node:path';

export function normalizeLinkTarget(href: string, sourcePath?: string): string | undefined {
  const withoutHash = href.split('#')[0];
  if (!withoutHash) return undefined;

  const absolute = withoutHash.replace(/^https?:\/\/[^/]+/i, '');
  const query = absolute.includes('?') ? absolute.slice(absolute.indexOf('?') + 1) : '';
  const pathPart = absolute.split('?')[0];
  let targetPath = pathPart;

  if (/^\/w\/index\.php$/i.test(pathPart)) {
    const params = new URLSearchParams(query);
    const title = params.get('title');
    return title ? title.replace(/\/index\.html$/i, '').replace(/\.html$/i, '') : undefined;
  }

  if (sourcePath && !pathPart.startsWith('/wiki/') && !pathPart.startsWith('wiki/')) {
    const sourceDir = sourcePath.split('/').slice(0, -1).join('/');
    targetPath = normalize(`${sourceDir}/${pathPart}`).replace(/\\/g, '/');
  }

  targetPath = targetPath.replace(/^\/?wiki\//, '').replace(/\/index\.html$/i, '').replace(/\.html$/i, '');
  targetPath = normalize(targetPath).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  return targetPath || undefined;
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
    const targetPageId = normalizeLinkTarget(href, _sourcePath);
    result.push({ href, label, targetPageId, linkType: 'internal', resolved: !!targetPageId && pageIds.has(targetPageId), redLink });
  });
  return result;
}
