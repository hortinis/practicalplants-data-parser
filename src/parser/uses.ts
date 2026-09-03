import type { CheerioAPI } from 'cheerio';
import type { ToxicityRecord, UseRecord } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { extractCitationIds } from './references.js';
import { extractLinks } from './links.js';

const categories = ['edible', 'material', 'medicinal'] as const;

export function extractUses($: CheerioAPI, sourcePath: string, pageIds: Set<string> = new Set()): UseRecord[] {
  const records: UseRecord[] = [];
  for (const category of categories) {
    const section = $(`#plant-${category}-uses`).first();
    if (!section.length) continue;
    section.find(':scope > .plant-uses').each((_, group) => {
      const plantPart = cleanText($(group).children('h4').first().text()) || undefined;
      $(group).find(':scope > .plant-use-list > .plant-use-list-item').each((_, item) => {
        const links = $(item).find('a');
        const use = cleanText(links.first().text()) || cleanText($(item).text()) || undefined;
        records.push({ category, plantPart, use, text: cleanText($(item).text()), links: extractLinks($, sourcePath, pageIds, $(item)), references: extractCitationIds($, item), sourceLocation: { page: sourcePath, section: 'Uses', field: `${category} uses` } });
      });
    });
  }
  return records;
}

export function extractToxicity($: CheerioAPI, sourcePath: string): ToxicityRecord[] {
  return $('.toxicpart').map((_, el) => ({
    plantParts: $(el).find('h4 a').map((_, a) => cleanText($(a).text())).get().filter(Boolean),
    compound: cleanText($(el).find('.toxicpart-compounds').first().clone().children().remove().end().text()) || undefined,
    severity: cleanText($(el).find('.toxicpart-toxicity').last().text()) || undefined,
    description: cleanText($(el).clone().find('h4, .toxic-compound, sup.reference, .smw-highlighter').remove().end().text()) || undefined,
    references: extractCitationIds($, el),
    sourceLocation: { page: sourcePath, section: 'Uses', field: 'Toxic parts' }
  })).get();
}
