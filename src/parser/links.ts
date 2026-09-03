import type { CheerioAPI, Cheerio } from 'cheerio';
import type { LinkRecord } from '../model/types.js';
import { normalize } from 'node:path';

function decodePageId(value: string): string | undefined {
  const decoded = decodeURIComponent(value).trim();
  if (!decoded) return undefined;
  return decoded
    .replace(/^\/?wiki\//i, '')
    .replace(/\/index\.html$/i, '')
    .replace(/\.html$/i, '')
    .replace(/^\//, '') || undefined;
}

export function normalizeLinkTarget(href: string, sourcePath?: string): string | undefined {
  const withoutHash = href.split('#')[0];
  if (!withoutHash) return undefined;

  const absolute = withoutHash.replace(/^https?:\/\/[^/]+/i, '');
  const queryIndex = absolute.indexOf('?');
  const query = queryIndex >= 0 ? absolute.slice(queryIndex + 1) : '';
  const pathPart = queryIndex >= 0 ? absolute.slice(0, queryIndex) : absolute;

  if (/^\/?w\/index\.php$/i.test(pathPart)) {
    return decodePageId(new URLSearchParams(query).get('title') || '');
  }

  if (/^\/?wiki\/?$/i.test(pathPart) || /^\/?wiki\/index\.html$/i.test(pathPart)) return '.';

  let targetPath = pathPart;
  if (sourcePath && !pathPart.startsWith('/wiki/') && !pathPart.startsWith('wiki/')) {
    const sourceDir = sourcePath.split('/').slice(0, -1).join('/');
    targetPath = normalize(`${sourceDir}/${pathPart}`).replace(/\\/g, '/');
  }

  targetPath = targetPath.replace(/^\/?wiki\//i, '');
  if (/^index\.html$/i.test(targetPath)) return '.';
  targetPath = targetPath.replace(/\/index\.html$/i, '').replace(/\.html$/i, '');
  targetPath = normalize(targetPath).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  return decodePageId(targetPath);
}

function isInternalWikiHref(href: string): boolean {
  return href.startsWith('./') || href.startsWith('../') || href.startsWith('/wiki/') || href.startsWith('wiki/') ||
    href.startsWith('/w/') || href.startsWith('w/') ||
    /^https?:\/\/practicalplants\.org\/(?:wiki|w\/index\.php)(?:[/?]|$)/i.test(href);
}

export function extractLinks($: CheerioAPI, sourcePath: string, pageIds: Set<string>, root?: Cheerio<any>): LinkRecord[] {
  const result: LinkRecord[] = [];
  const scope = root ?? $.root();
  scope.find('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || href.startsWith('#')) return;

    const redLink = $(el).hasClass('new') || /(?:^|[?&])redlink=1(?:&|$)/i.test(href);
    const internal = isInternalWikiHref(href);
    if (!internal) {
      result.push({ href, label, linkType: 'external' });
      return;
    }

    const targetPageId = normalizeLinkTarget(href, sourcePath);
    result.push({
      href,
      label,
      ...(targetPageId ? { targetPageId } : {}),
      linkType: 'internal',
      resolved: !!targetPageId && pageIds.has(targetPageId),
      ...(redLink ? { redLink: true } : {})
    });
  });
  return result;
}
