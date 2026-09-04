import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { classifyPage } from '../src/classifier.js';
import { extractFullData } from '../src/parser/full-data.js';
import { extractToxicity, extractUses } from '../src/parser/uses.js';
import { extractReferences } from '../src/parser/references.js';
import { parsePlant } from '../src/parser/plant.js';
import { parseAlias, parseCollection, parseIndex, parseConcept } from '../src/parser/non-plant.js';
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
    const result = extractFullData($, 'wiki/Solanum_lycopersicum/index.html', new Set(['Food','PH_scale']));
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
  it('classifies documentation namespaces', async () => {
    const { classifyPage } = await import('../src/classifier.js');
    const $ = load('<div id="article-title">Help</div><div id="mw-content-text"><h2>Contents</h2><p>Documentation</p></div>');
    expect(classifyPage($, 'wiki/Help:Contents/index.html', new Set())).toBe('documentation');
  });

  it('extracts common-name aliases', () => {
    const $ = load('<div id="article-title">Achira</div><div id="mw-content-text"><div id="article-summary">is a common name for <a href="/wiki/Canna_edulis">Canna edulis</a>.</div></div>');
    const page = parseAlias($, 'Achira', 'wiki/Achira/index.html', 'Practical Plants recovered archive', undefined, new Set(['Canna_edulis']));
    expect(page.identity.pageType).toBe('alias');
    expect(page.alias.targets).toEqual(['Canna_edulis']);
  });

  it('extracts family collections with absolute wiki URLs', () => {
    const $ = load('<div id="article-title">Aceraceae</div><div id="mw-content-text"><h2>Members of this family</h2><ul><li><a href="/wiki/Acer_acuminatum">Acer acuminatum</a></li></ul></div>');
    const page = parseCollection($, 'Aceraceae', 'wiki/Aceraceae/index.html', 'Practical Plants recovered archive', undefined, new Set(['Acer_acuminatum']), 'family');
    expect(page.collection.members).toEqual(['Acer_acuminatum']);
    expect(page.collection.completeness).toBe('populated');
  });

  it('preserves empty generated collections', () => {
    const $ = load('<div id="article-title">Abortifacient</div><div id="mw-content-text"><h2>Plants with parts able to be used as an Abortifacient</h2></div>');
    const page = parseCollection($, 'Abortifacient', 'wiki/Abortifacient/index.html', 'Practical Plants recovered archive', undefined, new Set(), 'use');
    expect(page.collection.members).toEqual([]);
    expect(page.collection.completeness).toBe('empty');
  });

  it('classifies specialized use collections', async () => {
    const { classifyPage } = await import('../src/classifier.js');
    const $ = load('<div id="article-title">Fruit</div><div id="mw-content-text"><h2>Fruit with edible uses</h2><ul><li><a href="/wiki/Solanum_lycopersicum">Tomato</a></li></ul></div>');
    expect(classifyPage($, 'wiki/Fruit/index.html', new Set(['Solanum_lycopersicum']))).toBe('collection');
  });

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


describe('corpus-derived link and index edge cases', () => {
  it('extracts MediaWiki red-link targets from edit URLs', async () => {
    const { extractLinks, normalizeLinkTarget } = await import('../src/parser/links.js');
    const $ = load('<div id="mw-content-text"><a class="new" href="/w/index.php?title=PH_scale&amp;action=edit&amp;redlink=1">PH values</a></div>');
    const links = extractLinks($, 'wiki/Acid_loving/index.html', new Set(['PH_scale']));
    expect(links[0]).toMatchObject({
      href: '/w/index.php?title=PH_scale&action=edit&redlink=1',
      label: 'PH values',
      targetPageId: 'PH_scale',
      linkType: 'internal',
      resolved: true,
      redLink: true
    });
    expect(normalizeLinkTarget('../../wiki//index.html', 'wiki/Abies/index.html')).toBe('.');
    expect(normalizeLinkTarget('/wiki/', 'wiki/Abies/index.html')).toBe('.');
  });

  it('classifies common-name collection pages as indexes', () => {
    const $ = load(`
      <div id="page-header"><h1 id="article-title">Abutilon</h1></div>
      <div id="mw-content-text">
        <div id="article-summary">is a common name used for a number of distinct species.</div>
        <h2><span class="mw-headline">Plants with the <a href="../../wiki/Common_name/index.html">common name</a> Abutilon</span></h2>
        <div><ul><li><a href="../../wiki/Abutilon_megapotamicum/index.html">Abutilon megapotamicum</a></li></ul></div>
      </div>`);
    expect(classifyPage($)).toBe('index');
  });

  it('preserves repeated Full Data fields instead of overwriting them', () => {
    const $ = load(`
      <div id="plant-datatable">
        <div class="infobox-section">
          <div class="infobox-title">Environment</div>
          <div class="infobox-content">
            <div class="infobox-subsection"><div class="infobox-title">Cultivation</div><div class="infobox-content">First</div></div>
            <div class="infobox-subsection"><div class="infobox-title">Cultivation</div><div class="infobox-content">Second</div></div>
          </div>
        </div>
      </div>`);
    const result = extractFullData($, 'wiki/Test/index.html');
    expect(result.Environment.Cultivation.map(v => v.rawValue)).toEqual(['First', 'Second']);
  });

  it('preserves links inside use records', async () => {
    const { extractUses } = await import('../src/parser/uses.js');
    const $ = load(`
      <div id="plant-edible-uses">
        <div class="plant-uses"><h4>Fruit</h4>
          <div class="plant-use-list"><div class="plant-use-list-item"><a href="../../wiki/Food/index.html">Fresh</a></div></div>
        </div>
      </div>`);
    const use = extractUses($, 'wiki/Test/index.html', new Set(['Food']))[0];
    expect(use.links?.[0]).toMatchObject({ targetPageId: 'Food', linkType: 'internal' });
  });
});
