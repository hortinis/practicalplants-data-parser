import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { classifyPage } from '../src/classifier.js';
import { extractFullData } from '../src/parser/full-data.js';
import { extractToxicity, extractUses } from '../src/parser/uses.js';
import { extractReferences } from '../src/parser/references.js';
import { parsePlant } from '../src/parser/plant.js';
import { parseIndex, parseConcept } from '../src/parser/non-plant.js';
import { valueStatus, normalizeSafe } from '../src/normalize/values.js';
import { readFileSync } from 'node:fs';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/observed/${name}`, import.meta.url), 'utf8');

describe('classification', () => {
  it('recognizes plant pages by plant-datatable', () => expect(classifyPage(load('<div id="plant-datatable"></div>'))).toBe('plant'));
  it('recognizes genus/index pages from the observed Abies structure', () => expect(classifyPage(load(fixture('abies-index-structure.html')))).toBe('index'));
  it('recognizes concept pages from the observed Canopy structure', () => expect(classifyPage(load(fixture('canopy-concept-structure.html')))).toBe('concept'));
  it('keeps uncertain pages unknown', () => expect(classifyPage(load('<h1>Mystery</h1><h2>Notes</h2>'))).toBe('unknown'));
});

describe('values', () => {
  it('preserves missing states', () => { expect(valueStatus('?')).toBe('unknown'); expect(valueStatus('None listed.')).toBe('none_listed'); expect(valueStatus('')).toBe('empty'); });
  it('normalizes complete mature size only', () => { expect(normalizeSafe('30 x 5 meters')).toEqual({ value1: 30, value2: 5, unit: 'meters' }); expect(normalizeSafe('15 x')).toBeUndefined(); });
});

describe('observed Practical Plants structures', () => {
  const $ = load(fixture('solanum-structure.html'));
  it('extracts the real page identity pattern', () => {
    const page = parsePlant($, 'Solanum_lycopersicum', 'wiki/Solanum_lycopersicum/index.html', 'Practical Plants recovered archive', 'abc', new Set(['Solanum_lycopersicum', 'Solanum']));
    expect(page.plant.scientificName).toBe('Solanum lycopersicum');
    expect(page.plant.commonNames).toEqual(['Tomato']);
    expect(page.taxonomy.genus).toBe('Solanum');
    expect(page.taxonomy.family).toBe('Solanaceae');
  });
  it('extracts Full Data infobox hierarchy and missing states', () => {
    const result = extractFullData($, 'wiki/Solanum_lycopersicum/index.html');
    expect(result.Environment['Hardiness Zone'][0].rawValue).toBe('9');
    expect(result.Environment['Heat Zone'][0].status).toBe('unknown');
    expect(result.Environment['Environmental Tolerances'][0].status).toBe('empty');
    expect(result.Environment['Soil PH'][0].links).toHaveLength(2);
  });
  it('extracts plant-part uses', () => {
    const result = extractUses($, 'wiki/Solanum_lycopersicum/index.html');
    expect(result[0].category).toBe('edible');
    expect(result[0].plantPart).toBe('Fruit');
    expect(result[0].use).toContain('Fresh');
  });
  it('extracts toxicity and citation IDs', () => {
    const result = extractToxicity($, 'wiki/Solanum_lycopersicum/index.html');
    expect(result[0].plantParts).toEqual(['Leaves', 'Stems']);
    expect(result[0].compound).toBe('Tomatine');
    expect(result[0].severity).toBe('low toxicity');
    expect(result[0].references).toContain('PFAFimport-16');
  });
  it('extracts bibliography records', () => {
    const result = extractReferences($);
    expect(result[0].id).toBe('cite_note-PFAFimport-16-16');
    expect(result[0].urls).toEqual(['https://example.org/source']);
  });
});

describe('non-plant observed structures', () => {
  it('extracts genus members', () => {
    const $ = load(fixture('abies-index-structure.html'));
    const page = parseIndex($, 'Abies', 'wiki/Abies/index.html', 'Practical Plants recovered archive', undefined, new Set(['Abies', 'Abies_amabilis']));
    expect(page.identity.pageType).toBe('index');
    expect(page.index.members).toEqual(['Abies_amabilis']);
  });
  it('extracts concept members', () => {
    const $ = load(fixture('canopy-concept-structure.html'));
    const page = parseConcept($, 'Canopy', 'wiki/Canopy/index.html', 'Practical Plants recovered archive', undefined, new Set(['Canopy', 'Abies_amabilis']));
    expect(page.identity.pageType).toBe('concept');
    expect(page.concept.members).toEqual(['Abies_amabilis']);
  });
});
