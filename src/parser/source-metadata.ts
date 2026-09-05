import type { CheerioAPI } from 'cheerio';
import type { LastModifiedMetadata, MediaWikiSourceMetadata } from '../model/types.js';
import { cleanText } from '../normalize/values.js';

const MONTHS: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
};

function normalizeLastModified(rawValue: string): LastModifiedMetadata | undefined {
  const raw = cleanText(rawValue);
  const match = raw.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4}), at (\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const month = MONTHS[match[2]];
  if (!month) return undefined;
  const day = match[1].padStart(2, '0');
  const hour = match[4].padStart(2, '0');
  const date = new Date(Date.UTC(Number(match[3]), Number(month) - 1, Number(day), Number(match[4]), Number(match[5])));
  if (date.getUTCFullYear() !== Number(match[3]) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day) || date.getUTCHours() !== Number(match[4]) || date.getUTCMinutes() !== Number(match[5])) return undefined;
  const localDateTime = `${match[3]}-${month}-${day}T${hour}:${match[5]}:00`;
  return { rawValue: raw, localDateTime };
}

export function extractSourceMetadata($: CheerioAPI): MediaWikiSourceMetadata {
  const metadata: MediaWikiSourceMetadata = {};
  const revisionHref = $('.printfooter a[href]').first().attr('href');
  if (revisionHref) {
    try {
      const url = new URL(revisionHref, 'https://practicalplants.org');
      const oldid = url.searchParams.get('oldid');
      const id = oldid ? Number(oldid) : NaN;
      if (Number.isSafeInteger(id) && id > 0) metadata.revision = { id, url: url.href };
    } catch { /* malformed source URLs do not invalidate the page */ }
  }

  $('#mw-footer-info li').each((_, element) => {
    const text = cleanText($(element).text());
    const modified = text.match(/^This page was last modified on (.+)\.$/i);
    if (modified && !metadata.lastModified) {
      const normalized = normalizeLastModified(modified[1]);
      if (normalized) metadata.lastModified = normalized;
    }
    const accessed = text.match(/^This page has been accessed ([\d,]+) times\.$/i);
    if (accessed && metadata.historicalAccessCount === undefined) {
      const count = Number(accessed[1].replace(/,/g, ''));
      if (Number.isSafeInteger(count) && count >= 0) metadata.historicalAccessCount = count;
    }
  });
  return metadata;
}
