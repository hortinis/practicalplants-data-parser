import type { CheerioAPI } from 'cheerio';
import type { PageType } from './model/types.js';

export function classifyPage($: CheerioAPI): PageType {
  if ($('#plant-datatable').length) return 'plant';
  const title = $('h1').first().text().trim();
  const categories = $('.catlinks, #mw-normal-catlinks').text().toLowerCase();
  const body = $('body').text().replace(/\\s+/g, ' ').trim().toLowerCase();
  if (/plants in the .+ genus/.test(body) || /\\bgenus\\b/.test(categories)) return 'index';
  if ($('#plant-list, .plant-list').length || /plants inhabiting|ecosystem niche/.test(body)) return 'concept';
  if (title && $('h2, h3').length > 0) return 'unknown';
  return 'unknown';
}
