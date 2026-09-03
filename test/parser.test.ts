import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { classifyPage } from '../src/classifier.js';
import { extractFullData } from '../src/parser/full-data.js';
import { valueStatus, normalizeSafe } from '../src/normalize/values.js';

describe('classification', () => {
  it('recognizes plant pages by plant-datatable', () => expect(classifyPage(load('<div id="plant-datatable"></div>'))).toBe('plant'));
  it('recognizes genus/index pages conservatively', () => expect(classifyPage(load('<h1>Abies</h1><p>Plants in the Abies genus</p><div class="catlinks">Genus</div>'))).toBe('index'));
  it('keeps uncertain pages unknown', () => expect(classifyPage(load('<h1>Mystery</h1><h2>Notes</h2>'))).toBe('unknown'));
});

describe('values', () => {
  it('preserves missing states', () => { expect(valueStatus('?')).toBe('unknown'); expect(valueStatus('None listed.')).toBe('none_listed'); expect(valueStatus('')).toBe('empty'); });
  it('normalizes complete mature size only', () => { expect(normalizeSafe('30 x 5 meters')).toEqual({ value1: 30, value2: 5, unit: 'meters' }); expect(normalizeSafe('15 x')).toBeUndefined(); });
});

describe('full data', () => {
  it('extracts label/content fields and source location', () => {
    const $ = load('<div id="plant-datatable"><h2>Environment</h2><div class="infobox-row"><div class="infobox-label">Hardiness Zone</div><div class="infobox-content">9</div></div></div>');
    const result = extractFullData($, 'wiki/X/index.html');
    expect(result.Environment['Hardiness Zone'][0].rawValue).toBe('9');
    expect(result.Environment['Hardiness Zone'][0].sourceLocation?.field).toBe('Hardiness Zone');
  });
});
