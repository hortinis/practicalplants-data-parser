import type { CheerioAPI } from 'cheerio';
import type { ReferenceRecord } from '../model/types.js';

export function extractReferences($: CheerioAPI): ReferenceRecord[] {
  const out: ReferenceRecord[] = [];
  $('ol.references > li[id], ol.references > li').each((i, el) => {
    const id = ($(el).attr('id') || `reference-${i + 1}`).trim();
    const rawText = $(el).text().replace(/\\s+/g, ' ').trim();
    const urls = $(el).find('a[href]').map((_, a) => ($(a).attr('href') || '').trim()).get().filter(Boolean);
    out.push({ id, rawText, urls });
  });
  return out.sort((a,b) => a.id.localeCompare(b.id));
}
