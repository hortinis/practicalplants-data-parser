import type { CheerioAPI } from 'cheerio';
import type { NarrativeSection } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { extractCitationIds } from './references.js';

const KNOWN = new Set(['Uses','Ecology','Propagation','Cultivation','Crops','Problems, pests & diseases','Associations & Interactions','Polycultures & Guilds','Descendants']);
export function extractNarrative($: CheerioAPI, sourcePath: string): NarrativeSection[] {
  const sections: NarrativeSection[] = [];
  $('#mw-content-text > .article-section').each((_, sectionEl) => {
    const heading = $(sectionEl).children('h2').find('.mw-headline').first();
    const title = cleanText(heading.text());
    if (!title || !KNOWN.has(title)) return;
    const links = $(sectionEl).find('a[href]').map((_, a) => ({ href: $(a).attr('href') || '', label: cleanText($(a).text()), linkType: 'unknown' as const, redLink: $(a).hasClass('new') })).get();
    const paragraphs = $(sectionEl).find('p, .pfaf-notes').map((_, p) => cleanText($(p).text())).get().filter(Boolean);
    const lists: string[][] = [];
    $(sectionEl).find('ul, ol').each((_, list) => {
      const items = $(list).children('li').map((_, li) => cleanText($(li).text())).get().filter(Boolean);
      if (items.length) lists.push(items);
    });
    sections.push({ id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), title, paragraphs, lists, links, references: extractCitationIds($, sectionEl), sourceLocation: { page: sourcePath, section: title } });
  });
  return sections;
}
