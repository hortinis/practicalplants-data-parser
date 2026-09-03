import type { CheerioAPI } from 'cheerio';
import type { PlantPage } from '../model/types.js';
import { extractFullData } from './full-data.js';
import { extractLinks } from './links.js';
import { extractNarrative } from './narrative.js';
import { extractReferences } from './references.js';
import { extractToxicity, extractUses } from './uses.js';

export function parsePlant($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): PlantPage {
  const title = $('h1').first().text().replace(/\\s+/g,' ').trim() || pageId;
  const infobox = $('.infobox').first();
  const commonNames = infobox.find('.common-name, .vernacular, [class*=common]').map((_, e) => $(e).text().trim()).get().filter(Boolean);
  const scientificName = infobox.find('.scientific-name, i, em').first().text().replace(/\\s+/g,' ').trim() || title;
  const taxonomy = { binomialName: scientificName || undefined, genus: undefined as string | undefined, family: undefined as string | undefined };
  const text = $('body').text().replace(/\\s+/g,' ').trim();
  const summary = $('p').first().text().replace(/\\s+/g,' ').trim() || undefined;
  const imageEl = infobox.find('img').first();
  const image = imageEl.length ? { filename: imageEl.attr('src')?.split('/').pop(), caption: imageEl.attr('title'), altText: imageEl.attr('alt') } : undefined;
  const references = extractReferences($);
  const links = extractLinks($, sourcePath, pageIds);
  return { identity: { pageId, title, pageType: 'plant', sourcePath }, source: { repository, commit }, plant: { scientificName, commonNames, summary, image }, taxonomy, fullData: extractFullData($, sourcePath), narrative: extractNarrative($, sourcePath), uses: extractUses($, sourcePath), toxicity: extractToxicity($, sourcePath), references, links };
}
