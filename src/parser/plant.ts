import type { CheerioAPI } from 'cheerio';
import type { PlantPage } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { extractFullData } from './full-data.js';
import { extractLinks } from './links.js';
import { extractNarrative } from './narrative.js';
import { extractPrimaryImage } from './image.js';
import { extractReferences } from './references.js';
import { extractToxicity, extractUseNotes, extractUses } from './uses.js';
import { extractCategoryMemberships } from './categories.js';

export function parsePlant($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): PlantPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  const scientificName = cleanText($('#article-title .binomial').first().text()) || undefined;
  const commonNames = $('#common-name li').map((_, li) => cleanText($(li).text())).get().filter(Boolean);
  const summary = cleanText($('#article-summary').first().text()) || undefined;
  const image = extractPrimaryImage($, sourcePath);
  const taxonomy = { binomialName: scientificName, genus: cleanText($('#article-summary .genus').first().text()) || undefined, family: cleanText($('#article-summary .family').first().text()) || undefined };
  const references = extractReferences($);
  return { identity: { pageId, title, pageType: 'plant', sourcePath }, source: { repository, commit }, plant: { scientificName, commonNames, summary, image }, taxonomy, fullData: extractFullData($, sourcePath, pageIds), narrative: extractNarrative($, sourcePath, pageIds), uses: extractUses($, sourcePath, pageIds), useNotes: extractUseNotes($, sourcePath, pageIds), toxicity: extractToxicity($, sourcePath), references, links: extractLinks($, sourcePath, pageIds), categories: extractCategoryMemberships($, sourcePath, pageIds) };
}
