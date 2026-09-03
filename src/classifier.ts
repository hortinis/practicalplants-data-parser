import type { CheerioAPI } from 'cheerio';
import type { PageType } from './model/types.js';
import { cleanText } from './normalize/values.js';

function hasPlantCollection($: CheerioAPI): boolean {
  const body = $('#mw-content-text').first();
  if (!body.length) return false;
  const collectionHeading = body.find('h2, h3').filter((_, h) => {
    const text = cleanText($(h).text());
    return /^(?:Plants (?:in|with|which|that)|Members of this family|Pages (?:using|in)|List of )/i.test(text);
  }).length > 0;
  const plantLinks = body.find('li a[href]').filter((_, a) => {
    const href = ($(a).attr('href') || '');
    return /(?:^|\/)wiki\/.+\/index\.html(?:[#?].*)?$/i.test(href) || /(?:^|\?)title=[^&]+/i.test(href);
  }).length;
  return collectionHeading && plantLinks > 0;
}

export function classifyPage($: CheerioAPI): PageType {
  if ($('#plant-datatable').length || $('.plant-name .binomial').length && $('#page-header.with-image').length) return 'plant';

  const title = cleanText($('#article-title').first().text());
  const headings = $('h2, h3').map((_, h) => cleanText($(h).text())).get();
  const categories = cleanText($('#catlinks').first().text()).toLowerCase();

  if (hasPlantCollection($) || /\bgenus\b/.test(categories)) return 'index';
  if (headings.some(h => /^Plants inhabiting this ecosystem niche$/i.test(h)) || /ecosystem niche/i.test(categories) && title) return 'concept';
  return 'unknown';
}
