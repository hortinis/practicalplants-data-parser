import type { CheerioAPI } from 'cheerio';
import type { CategoryMembership, LinkRecord } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { isInternalWikiHref, normalizeLinkTarget } from './links.js';

function membershipLink($: CheerioAPI, element: any, sourcePath: string, pageIds: Set<string>): LinkRecord | undefined {
  const href = ($(element).attr('href') || '').trim();
  if (!href || !isInternalWikiHref(href)) return undefined;
  const targetPageId = normalizeLinkTarget(href, sourcePath);
  if (!targetPageId?.startsWith('Category:')) return undefined;
  const redLink = $(element).hasClass('new') || /(?:^|[?&])redlink=1(?:&|$)/i.test(href);
  return {
    href,
    label: cleanText($(element).text()),
    targetPageId,
    linkType: 'internal',
    resolved: pageIds.has(targetPageId),
    ...(redLink ? { redLink: true } : {})
  };
}

export function extractCategoryMemberships($: CheerioAPI, sourcePath: string, pageIds: Set<string>): CategoryMembership[] {
  const memberships: CategoryMembership[] = [];
  const seen = new Set<string>();

  const collect = (selector: string, hidden: boolean) => {
    $(selector).find('li a[href]').each((_, element) => {
      const link = membershipLink($, element, sourcePath, pageIds);
      if (!link?.targetPageId) return;
      const key = `${hidden}:${link.targetPageId}`;
      if (seen.has(key)) return;
      seen.add(key);
      memberships.push({
        categoryPageId: link.targetPageId,
        name: link.label || link.targetPageId.replace(/^Category:/, '').replace(/_/g, ' '),
        hidden,
        link,
        sourceLocation: { page: sourcePath, section: 'Categories', field: hidden ? 'hidden' : 'normal' }
      });
    });
  };

  collect('#mw-normal-catlinks', false);
  collect('#mw-hidden-catlinks', true);
  return memberships;
}
