import type { CheerioAPI } from 'cheerio';
import type { EcologicalFunction } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { isInternalWikiHref, normalizeLinkTarget } from './links.js';

export function extractEcologicalFunctions($: CheerioAPI, sourcePath: string, pageIds: Set<string> = new Set()): EcologicalFunction[] {
  const result: EcologicalFunction[] = [];
  $('#plant-functions h3').filter((_, h) => /Ecological Functions/i.test(cleanText($(h).text()))).first().each((_, heading) => {
    let node = $(heading).next();
    while (node.length && !node.is('h3')) {
      node.find('a[href]').each((_, anchor) => {
        const href = $(anchor).attr('href') || '';
        if (!isInternalWikiHref(href)) return;
        const targetPageId = normalizeLinkTarget(href, sourcePath);
        if (!targetPageId) return;
        const link = { href, label: cleanText($(anchor).text()), targetPageId, linkType: 'internal' as const, resolved: pageIds.size ? pageIds.has(targetPageId) : undefined, redLink: $(anchor).hasClass('new') || undefined };
        result.push({ name: cleanText($(anchor).text()), link, sourceLocation: { page: sourcePath, section: 'Ecology', field: 'Ecological Functions' } });
      });
      node = node.next();
    }
  });
  const seen = new Set<string>();
  return result.filter(item => { const key = item.link.targetPageId!; if (seen.has(key)) return false; seen.add(key); return true; });
}
