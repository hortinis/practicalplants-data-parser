import type { CheerioAPI } from 'cheerio';
import type { LinkRecord, SemanticFact, SemanticValue } from '../model/types.js';
import { cleanText } from '../normalize/values.js';
import { isInternalWikiHref, normalizeLinkTarget } from './links.js';

function linkRecord($: CheerioAPI, element: any, sourcePath: string, pageIds: Set<string>): LinkRecord | undefined {
  const href = ($(element).attr('href') || '').trim();
  if (!href || href.startsWith('#')) return undefined;
  const label = cleanText($(element).text());
  const redLink = $(element).hasClass('new') || /(?:^|[?&])redlink=1(?:&|$)/i.test(href);
  if (!isInternalWikiHref(href)) return { href, label, linkType: 'external' };
  const targetPageId = normalizeLinkTarget(href, sourcePath);
  return {
    href,
    label,
    ...(targetPageId ? { targetPageId } : {}),
    linkType: 'internal',
    resolved: !!targetPageId && pageIds.has(targetPageId),
    ...(redLink ? { redLink: true } : {})
  };
}

function segmentValue($: CheerioAPI, nodes: any[], sourcePath: string, pageIds: Set<string>, searchHref?: string): SemanticValue | undefined {
  const rawValue = cleanText(nodes.map(node => $(node).text()).join(' ')).replace(/^(?:,|and)\s+/i, '').trim();
  if (!rawValue) return undefined;
  const links = nodes
    .filter(node => node.type === 'tag' && node.name === 'a' && !$(node).closest('.smwsearch').length)
    .map(node => linkRecord($, node, sourcePath, pageIds))
    .filter((link): link is LinkRecord => !!link);
  return { rawValue, links, ...(searchHref ? { searchHref } : {}) };
}

function valuesFromCell($: CheerioAPI, cell: any, sourcePath: string, pageIds: Set<string>): SemanticValue[] {
  const values: SemanticValue[] = [];
  let segment: any[] = [];
  cell.contents().each((_index: number, node: any) => {
    if ($(node).hasClass('smwsearch')) {
      const searchHref = $(node).find('a[href]').first().attr('href');
      const value = segmentValue($, segment, sourcePath, pageIds, searchHref);
      if (value) values.push(value);
      segment = [];
    } else {
      segment.push(node);
    }
  });
  const finalValue = segmentValue($, segment, sourcePath, pageIds);
  if (finalValue) values.push(finalValue);
  return values;
}

export function extractSemanticFacts($: CheerioAPI, sourcePath: string, pageIds: Set<string> = new Set()): SemanticFact[] {
  const facts: SemanticFact[] = [];
  $('.smwfacttable tr').each((_, row) => {
    const propertyCell = $(row).children('td.smwpropname, td.smwspecname').first();
    const valueCell = $(row).children('td.smwprops, td.smwspecs').first();
    if (!propertyCell.length || !valueCell.length) return;
    const propertyAnchor = propertyCell.find('a[href]').first();
    const propertyName = cleanText(propertyAnchor.text() || propertyCell.text()).replace(/\s+/g, ' ');
    if (!propertyName) return;
    const propertyLink = propertyAnchor.length ? linkRecord($, propertyAnchor, sourcePath, pageIds) : undefined;
    const rawCell = valueCell.clone();
    rawCell.find('.smwsearch').remove();
    const rawText = cleanText(rawCell.text());
    facts.push({
      property: { name: propertyName, ...(propertyLink ? { link: propertyLink } : {}), kind: propertyCell.hasClass('smwspecname') ? 'special' : 'ordinary' },
      rawText,
      values: valuesFromCell($, valueCell, sourcePath, pageIds),
      sourceLocation: { page: sourcePath, section: 'Semantic facts', field: propertyName }
    });
  });
  return facts;
}
