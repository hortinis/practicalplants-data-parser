import type { CheerioAPI } from 'cheerio';
import type { FieldValue } from '../model/types.js';
import { normalizeSafe, valueStatus } from '../normalize/values.js';

function makeValue($: CheerioAPI, el: any, page: string, section: string, field: string): FieldValue[] {
  const links = $(el).find('a[href]').map((_, a) => ({ href: $(a).attr('href') || '', label: $(a).text().trim(), linkType: 'unknown' as const })).get();
  const items = $(el).find('li').map((_, li) => $(li).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean);
  const raw = items.length ? items : [$(el).text().replace(/\s+/g, ' ').trim()];
  return raw.map(rawValue => ({ rawValue, normalizedValue: normalizeSafe(rawValue), status: valueStatus(rawValue), links, sourceLocation: { page, section, field } }));
}

export function extractFullData($: CheerioAPI, sourcePath: string): Record<string, Record<string, FieldValue[]>> {
  const out: Record<string, Record<string, FieldValue[]>> = {};
  const root = $('#plant-datatable');
  if (!root.length) return out;
  let currentSection = 'Full Data';
  root.find('h2, h3, h4, .datatable-section, .field-label').each((_, el) => {
    const tag = (el as any).tagName?.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (/^h[23]$/.test(tag || '')) currentSection = text;
    else if (tag === 'h4') {
      const parent = $(el).parent();
      const label = text;
      const content = parent.find('.infobox-content, .field-value, ul, p').first();
      if (!out[currentSection]) out[currentSection] = {};
      out[currentSection][label] = makeValue($, content.length ? content : el, sourcePath, currentSection, label);
    }
  });
  // Generic fallback for common label/content layouts.
  root.find('div.infobox-row, tr').each((_, row) => {
    const label = $(row).find('.infobox-label, th, .field-label').first().text().replace(/\s+/g, ' ').trim();
    const content = $(row).find('.infobox-content, td, .field-value').last();
    if (!label || !content.length) return;
    if (!out[currentSection]) out[currentSection] = {};
    if (!out[currentSection][label]) out[currentSection][label] = makeValue($, content, sourcePath, currentSection, label);
  });
  return out;
}
