import type { Cheerio, CheerioAPI } from 'cheerio';
import type { InteractionField, InteractionMember, InteractionPage } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { extractLinks } from './links.js';
import { extractCitationIds, extractReferences } from './references.js';

function sectionHeading($: CheerioAPI, id: string): Cheerio<any> {
  const byId = $(`#${id}`).first().closest('h1, h2, h3, h4, h5, h6');
  if (byId.length) return byId;
  const expected = id.replace(/_/g, ' ').toLowerCase();
  return $('#mw-content-text h1, #mw-content-text h2, #mw-content-text h3, #mw-content-text h4, #mw-content-text h5, #mw-content-text h6')
    .filter((_, heading) => cleanText($(heading).text()).toLowerCase() === expected).first();
}

function interactionField($: CheerioAPI, id: string, sourcePath: string, pageIds: Set<string>): InteractionField {
  const heading = sectionHeading($, id);
  const content = heading.nextUntil('h1, h2, h3, h4, h5, h6')
    .filter((_, element) => !$(element).is('#article-references, .references'));
  const title = cleanText(heading.text()) || id.replace(/_/g, ' ');
  return {
    text: content.map((_, element) => cleanText($(element).text())).get().filter(Boolean).join('\n\n'),
    links: extractLinks($, sourcePath, pageIds, content),
    references: extractCitationIds($, content),
    sourceLocation: { page: sourcePath, section: title }
  };
}

function memberPageId(name: string, links: InteractionField['links'], pageIds: Set<string>): string | undefined {
  const linked = links.find(link => link.linkType === 'internal' && link.targetPageId)?.targetPageId;
  if (linked) return linked;
  const normalizedName = name.replace(/_/g, ' ').toLowerCase();
  return [...pageIds].find(pageId => pageId.replace(/_/g, ' ').toLowerCase() === normalizedName);
}

function interactionMember($: CheerioAPI, id: 'Left_member' | 'Right_member', sourcePath: string, pageIds: Set<string>): InteractionMember {
  const field = interactionField($, id, sourcePath, pageIds);
  const name = field.text;
  const pageId = memberPageId(name, field.links, pageIds);
  return { name, ...(pageId ? { pageId } : {}), links: field.links, sourceLocation: field.sourceLocation };
}

export function parseInteraction($: CheerioAPI, pageId: string, sourcePath: string, repository: string, commit: string | undefined, pageIds: Set<string>): InteractionPage {
  const title = cleanText($('#article-title').first().text()) || pageId;
  return {
    identity: { pageId, title, pageType: 'interaction', sourcePath },
    source: { repository, commit },
    references: extractReferences($),
    links: extractLinks($, sourcePath, pageIds),
    interaction: {
      description: cleanText($('#article-summary').first().text()) || undefined,
      leftMember: interactionMember($, 'Left_member', sourcePath, pageIds),
      rightMember: interactionMember($, 'Right_member', sourcePath, pageIds),
      direction: interactionField($, 'Direction', sourcePath, pageIds),
      effect: interactionField($, 'Effect', sourcePath, pageIds),
      impact: interactionField($, 'Impact', sourcePath, pageIds),
      details: interactionField($, 'Details', sourcePath, pageIds)
    }
  };
}
