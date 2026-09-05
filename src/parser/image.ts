import type { CheerioAPI } from 'cheerio';
import type { ImageInfo } from '../model/types.js';
import { cleanText } from '../normalize/values.js';

const PRIMARY_IMAGE_PROPERTY = 'Has primary image';

function semanticPrimaryImageFilename($: CheerioAPI): string | undefined {
  let filename: string | undefined;

  $('.smwfacttable tr').each((_, row) => {
    if (filename) return;
    const cells = $(row).children('td');
    if (cleanText(cells.first().text()) !== PRIMARY_IMAGE_PROPERTY) return;

    const value = cells.eq(1).clone();
    value.find('.smwsearch').remove();
    filename = cleanText(value.text()) || undefined;
  });

  return filename;
}

export function extractPrimaryImage($: CheerioAPI, sourcePath: string): ImageInfo | undefined {
  const imageContainer = $('#article-image').first();
  const imageEl = imageContainer.find('img').first();
  const imageLink = imageContainer.find('a[href]').first().attr('href');
  const semanticFilename = semanticPrimaryImageFilename($);
  const renderedFilename = imageEl.attr('alt') || imageEl.attr('src')?.split('/').pop();
  const filename = semanticFilename || renderedFilename;

  if (!filename) return undefined;

  return {
    filename,
    ...(imageEl.attr('alt') ? { altText: imageEl.attr('alt') } : {}),
    ...(imageLink ? { sourceLink: imageLink } : {}),
    ...(semanticFilename ? {
      semanticProperty: PRIMARY_IMAGE_PROPERTY,
      sourceLocation: { page: sourcePath, section: 'Semantic facts', field: PRIMARY_IMAGE_PROPERTY }
    } : {}),
    brokenFile: imageEl.length === 0
  };
}
