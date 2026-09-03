import type { CheerioAPI } from 'cheerio';
import type { ReferenceRecord } from '../model/types.js';
import { cleanText } from '../normalize/values.js';

export function extractCitationIds($: CheerioAPI, root: any): string[] {
  return $(root).find('sup.reference a[href^="#cite_note-"]').map((_, a) => ($(a).attr('href') || '').replace(/^#cite_note-/, '')).get().filter(Boolean);
}

export function extractReferences($: CheerioAPI): ReferenceRecord[] {
  const out: ReferenceRecord[] = [];
  $('ol.references > li').each((i, el) => {
    const id = ($(el).attr('id') || `reference-${i + 1}`).trim();
    const text = $(el).find('.reference-text').text() || $(el).text();
    const rawText = cleanText(text);
    const urls = $(el).find('a[href]').map((_, a) => ($(a).attr('href') || '').trim()).get().filter(Boolean);
    const isbn = $(el).find('.mw-magiclink-isbn').text().trim().replace(/^ISBN\s*/i, '') || undefined;
    out.push({ id, rawText, isbn, urls });
  });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
