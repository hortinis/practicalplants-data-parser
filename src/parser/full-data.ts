import type { CheerioAPI } from 'cheerio';
import type { FieldValue } from '../model/types.js';
import { cleanText, normalizeSafe, valueStatus } from '../normalize/values.js';

function fieldValue($: CheerioAPI, content: any, page: string, section: string, field: string): FieldValue[] {
  const links = $(content).find('a[href]').map((_, a) => ({ href: $(a).attr('href') || '', label: cleanText($(a).text()), linkType: 'unknown' as const, redLink: $(a).hasClass('new') || /redlink=1/.test($(a).attr('href') || '') })).get();
  const listItems = $(content).children('ul,ol').find('li').map((_, li) => cleanText($(li).text())).get().filter(Boolean);
  const raw = listItems.length ? listItems : [cleanText($(content).clone().find('sup.reference').remove().end().text())];
  return raw.map(rawValue => ({ rawValue, ...(normalizeSafe(rawValue) !== undefined ? { normalizedValue: normalizeSafe(rawValue) } : {}), status: valueStatus(rawValue), links, sourceLocation: { page, section, field } }));
}

export function extractFullData($: CheerioAPI, sourcePath: string): Record<string, Record<string, FieldValue[]>> {
  const out: Record<string, Record<string, FieldValue[]>> = {};
  const root = $('#plant-datatable').first();
  if (!root.length) return out;
  root.find('.infobox-section').each((_, sectionEl) => {
    const title = cleanText($(sectionEl).children('.infobox-title').first().text());
    if (!title) return;
    const fields: Record<string, FieldValue[]> = out[title] || {};
    $(sectionEl).children('.infobox-content').first().find('.infobox-subsection').each((_, sub) => {
      const field = cleanText($(sub).children('.infobox-title').first().text());
      const content = $(sub).children('.infobox-content').first();
      if (field && content.length) fields[field] = fieldValue($, content, sourcePath, title, field);
    });
    out[title] = fields;
  });
  return out;
}
