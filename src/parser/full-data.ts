import type { CheerioAPI } from 'cheerio';
import type { FieldValue } from '../model/types.js';
import { cleanText, normalizeSafe, valueStatus } from '../normalize/values.js';
import { extractLinks } from './links.js';

function fieldValue($: CheerioAPI, content: any, page: string, section: string, field: string, pageIds: Set<string>): FieldValue[] {
  const links = extractLinks($, page, pageIds, $(content));
  const listItems = $(content).children('ul,ol').find('li').map((_, li) => cleanText($(li).text())).get().filter(Boolean);
  const raw = listItems.length ? listItems : [cleanText($(content).clone().find('sup.reference').remove().end().text())];
  return raw.map(rawValue => ({ rawValue, ...(normalizeSafe(rawValue) !== undefined ? { normalizedValue: normalizeSafe(rawValue) } : {}), status: valueStatus(rawValue), links, sourceLocation: { page, section, field } }));
}

export function extractFullData($: CheerioAPI, sourcePath: string, pageIds: Set<string> = new Set()): Record<string, Record<string, FieldValue[]>> {
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
      if (field && content.length) {
  const values = fieldValue($, content, sourcePath, title, field, pageIds);
  fields[field] = [...(fields[field] || []), ...values];
}
    });
    out[title] = fields;
  });
  return out;
}
