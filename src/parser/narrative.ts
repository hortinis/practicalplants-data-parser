import type { CheerioAPI } from 'cheerio';
import type { NarrativeSection } from '../model/types.js';

const KNOWN = ['Uses', 'Ecology', 'Propagation', 'Cultivation', 'Crops', 'Problems, pests & diseases', 'Associations & Interactions', 'Polycultures & Guilds', 'Descendants', 'References'];
export function extractNarrative($: CheerioAPI, sourcePath: string): NarrativeSection[] {
  const sections: NarrativeSection[] = [];
  $('h2, h3').each((_, h) => {
    const title = $(h).text().replace(/\s+/g, ' ').trim();
    if (!title || !KNOWN.some(k => k.toLowerCase() === title.toLowerCase())) return;
    const container = $(h).parent();
    const paragraphs = container.find('p').map((_, p) => $(p).text().replace(/\\s+/g, ' ').trim()).get().filter(Boolean);
    const lists = container.find('ul, ol').map((_, ul) => $(ul).find('li').map((_, li) => $(li).text().replace(/\s+/g, ' ').trim()).get()).get().filter(x => x.length);
    const links = container.find('a[href]').map((_, a) => ({ href: $(a).attr('href') || '', label: $(a).text().trim(), linkType: 'unknown' as const })).get();
    sections.push({ id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), title, paragraphs, lists, links, references: [], sourceLocation: { page: sourcePath, section: title } });
  });
  return sections;
}
