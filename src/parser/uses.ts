import type { CheerioAPI } from 'cheerio';
import type { UseRecord, ToxicityRecord } from '../model/types.js';

export function extractUses($: CheerioAPI, sourcePath: string): UseRecord[] {
  const records: UseRecord[] = [];
  for (const category of ['edible', 'material', 'medicinal'] as const) {
    const section = $('h2,h3').filter((_, h) => $(h).text().trim().toLowerCase() === `${category} uses`).first().parent();
    section.find('li').each((_, li) => records.push({ category, text: $(li).text().replace(/\s+/g, ' ').trim(), references: [], sourceLocation: { page: sourcePath, section: 'Uses', field: `${category} uses` } }));
  }
  return records;
}

export function extractToxicity($: CheerioAPI, sourcePath: string): ToxicityRecord[] {
  const out: ToxicityRecord[] = [];
  $('h2,h3').filter((_, h) => /uses/i.test($(h).text())).first().parent().find('table').each((_, table) => {
    const values = $(table).find('tr').map((_, tr) => $(tr).find('th,td').map((_, c) => $(c).text().replace(/\s+/g, ' ').trim()).get()).get();
    for (const row of values) if (row.length >= 2 && /parts|compound|severity/i.test(row[0])) out.push({ plantParts: /parts/i.test(row[0]) ? row.slice(1) : [], compound: /compound/i.test(row[0]) ? row.slice(1).join(' ') : undefined, severity: /severity/i.test(row[0]) ? row.slice(1).join(' ') : undefined, references: [], sourceLocation: { page: sourcePath, section: 'Uses', field: 'Toxicity' } });
  });
  return out;
}
