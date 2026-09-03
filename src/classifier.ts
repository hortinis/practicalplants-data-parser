import type { CheerioAPI } from 'cheerio';
import type { PageType } from './model/types.js';
import { cleanText } from './normalize/values.js';

export function classifyPage($: CheerioAPI): PageType {
  if ($('#plant-datatable').length || $('.plant-name .binomial').length && $('#page-header.with-image').length) return 'plant';
  const title = cleanText($('#article-title').first().text());
  const headings = $('h2, h3').map((_, h) => cleanText($(h).text())).get();
  const body = cleanText($('#mw-content-text').first().text());
  const categories = cleanText($('#catlinks').first().text()).toLowerCase();
  if (/^Plants in the .+ genus$/i.test(headings.find(h => /^Plants in the .+ genus$/i.test(h)) || '') || /\bgenus\b/.test(categories)) return 'index';
  if (headings.some(h => /^Plants inhabiting this ecosystem niche$/i.test(h)) || /ecosystem niche/i.test(categories) && title) return 'concept';
  if (title) return 'unknown';
  return 'unknown';
}
