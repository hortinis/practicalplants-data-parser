import type { Cheerio, CheerioAPI } from 'cheerio';
import type { NarrativeSection, PolycultureMember, PolycultureMemberField, PolyculturePage } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { extractLinks } from './links.js';
import { extractCitationIds, extractReferences } from './references.js';
import { extractCategoryMemberships } from './categories.js';

function memberField($: CheerioAPI, cell: Cheerio<any>, sourcePath: string, pageIds: Set<string>): PolycultureMemberField {
  return { text: cleanText(cell.text()), links: extractLinks($, sourcePath, pageIds, cell) };
}

function memberTable($: CheerioAPI): Cheerio<any> {
  let heading = $('#Polyculture_members').closest('h2, h3').first();
  if (!heading.length) {
    heading = $('#mw-content-text h2, #mw-content-text h3').filter((_, element) => /^Polyculture members$/i.test(cleanText($(element).text()))).first();
  }
  return heading.nextAll('.tbl').first();
}

function extractMembers($: CheerioAPI, sourcePath: string, pageIds: Set<string>): PolycultureMember[] {
  const members: PolycultureMember[] = [];
  const table = memberTable($);

  table.children('.row').each((_, row) => {
    const cells = $(row).children('.cell');
    if (cells.length < 4) return;
    const speciesCell = cells.eq(0);
    const speciesLinks = extractLinks($, sourcePath, pageIds, speciesCell);
    const primaryLink = speciesLinks.find(link => link.linkType === 'internal');
    const name = cleanText(speciesCell.find('.plant-name').first().text()) || primaryLink?.label || cleanText(speciesCell.text());
    if (!name) return;
    const commonNames = speciesCell.find('.common-name').map((_, el) => cleanText($(el).text()).replace(/^\(|\)$/g, ''))
      .get().flatMap(value => value.split(',').map(part => cleanText(part))).filter(Boolean);

    members.push({
      plant: {
        name,
        ...(primaryLink?.targetPageId ? { pageId: primaryLink.targetPageId } : {}),
        commonNames,
        links: speciesLinks
      },
      ecosystemNiches: memberField($, cells.eq(1), sourcePath, pageIds),
      functions: memberField($, cells.eq(2), sourcePath, pageIds),
      uses: memberField($, cells.eq(3), sourcePath, pageIds),
      sourceLocation: { page: sourcePath, section: 'Polyculture members', field: `row ${members.length + 1}` }
    });
  });
  return members;
}

function sectionId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractNarrative($: CheerioAPI, sourcePath: string, pageIds: Set<string>): NarrativeSection[] {
  const body = $('#mw-content-text').first();
  const table = memberTable($);
  const groups: Array<{ title: string; id: string; elements: any[] }> = [];
  let current: { title: string; id: string; elements: any[] } | undefined;
  let afterMembers = false;

  body.children().each((_, element) => {
    const node = $(element);
    if (element === table.get(0)) { afterMembers = true; return; }
    if (!afterMembers) return;
    if (node.is('#article-references')) return false;
    if (node.is('h2, h3')) {
      const title = cleanText(node.text());
      if (/^References$/i.test(title)) return false;
      current = { title, id: node.find('.mw-headline').attr('id') || sectionId(title), elements: [] };
      groups.push(current);
      return;
    }
    if (!current) {
      current = { title: 'Overview', id: 'overview', elements: [] };
      groups.push(current);
    }
    current.elements.push(element);
  });

  return groups.map(group => {
    const scope = $(group.elements);
    const paragraphs = scope.filter('p').add(scope.find('p')).map((_, p) => cleanText($(p).text())).get().filter(Boolean);
    const lists: string[][] = [];
    scope.filter('ul, ol').add(scope.find('ul, ol')).each((_, list) => {
      const items = $(list).children('li').map((_, li) => cleanText($(li).text())).get().filter(Boolean);
      if (items.length) lists.push(items);
    });
    return {
      id: group.id,
      title: group.title,
      paragraphs,
      lists,
      links: extractLinks($, sourcePath, pageIds, scope),
      references: extractCitationIds($, scope),
      sourceLocation: { page: sourcePath, section: group.title }
    };
  }).filter(section => section.paragraphs.length || section.lists.length || section.links.length || section.references.length);
}

export function parsePolyculture($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): PolyculturePage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  return {
    identity: { pageId, title, pageType: 'polyculture', sourcePath },
    source: { repository, commit },
    references: extractReferences($),
    links: extractLinks($, sourcePath, pageIds),
    categories: extractCategoryMemberships($, sourcePath, pageIds),
    polyculture: {
      description: cleanText($('#article-summary').first().text()) || undefined,
      members: extractMembers($, sourcePath, pageIds),
      narrative: extractNarrative($, sourcePath, pageIds)
    }
  };
}
