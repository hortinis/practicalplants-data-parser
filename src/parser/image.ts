import type { CheerioAPI } from 'cheerio';
import type { ImageInfo, SemanticFact } from '../model/types.js';
import { extractSemanticFacts } from './semantic-facts.js';

const PRIMARY_IMAGE_PROPERTY = 'Has primary image';

function semanticPrimaryImageFilename(facts: SemanticFact[] = []): string | undefined {
  return facts.find(fact => fact.property.name === PRIMARY_IMAGE_PROPERTY)?.values[0]?.rawValue;
}

export function extractPrimaryImage($: CheerioAPI, sourcePath: string, semanticFacts: SemanticFact[] = extractSemanticFacts($, sourcePath)): ImageInfo | undefined {
  const imageContainer = $('#article-image').first();
  const imageEl = imageContainer.find('img').first();
  const imageLink = imageContainer.find('a[href]').first().attr('href');
  const semanticFilename = semanticPrimaryImageFilename(semanticFacts);
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
