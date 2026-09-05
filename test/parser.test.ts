import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { classifyPage } from '../src/classifier.js';
import { extractFullData } from '../src/parser/full-data.js';
import { extractToxicity, extractUseNotes, extractUses } from '../src/parser/uses.js';
import { extractReferences } from '../src/parser/references.js';
import { parsePlant } from '../src/parser/plant.js';
import { extractPrimaryImage } from '../src/parser/image.js';
import { parseAlias, parseCollection, parseIndex, parseConcept } from '../src/parser/non-plant.js';
import { valueStatus, normalizeSafe } from '../src/normalize/values.js';
import { recoverEmptyUseCollections } from '../src/recovery/use-collections.js';
import { downloadPrimaryImages } from '../src/recovery/images.js';
import { parsePolyculture } from '../src/parser/polyculture.js';
import { validatePage } from '../src/validate.js';
import type { CollectionPage, PlantPage } from '../src/model/types.js';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  it('extracts category-level use notes with clean prose and provenance', () => {
    const result = extractUseNotes($, 'wiki/Solanum_lycopersicum/index.html', new Set(['Fresh']));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: 'edible',
      text: 'Fruit can be eaten fresh or preserved using an external recipe.',
      references: ['PFAFimport-21', 'PFAFimport-21'],
      sourceLocation: { page: 'wiki/Solanum_lycopersicum/index.html', section: 'Uses', field: 'edible notes' }
    });
    expect(result[0].links).toEqual([
      expect.objectContaining({ targetPageId: 'Fresh', linkType: 'internal', resolved: true }),
      expect.objectContaining({ href: 'https://example.org/recipe', linkType: 'external' })
    ]);
  });
  it('includes use notes in parsed plant pages', () => {
    const page = parsePlant($, 'Solanum_lycopersicum', 'wiki/Solanum_lycopersicum/index.html', 'Practical Plants recovered archive', 'abc', new Set(['Fresh']));
    expect(page.useNotes).toHaveLength(1);
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

describe('primary image recovery', () => {
  const semanticFacts = (filename: string) => `
    <table class="smwfacttable"><tr>
      <td class="smwpropname"><a title="Property:Has primary image">Has&nbsp;primary&nbsp;image</a></td>
      <td class="smwprops">${filename} <span class="smwsearch"><a href="/wiki/Special:SearchByProperty/Has-20primary-20image/${filename}">+</a></span></td>
    </tr></table>`;

  it('recovers a semantic filename and broken file-page link when no image rendered', () => {
    const $ = load(`
      <div id="article-image"><a href="../../wiki/File:Aconitum_columbianum_6017.JPG/index.html">248px</a></div>
      ${semanticFacts('Aconitum_columbianum_6017.JPG')}`);

    expect(extractPrimaryImage($, 'wiki/Aconitum_columbianum/index.html')).toEqual({
      filename: 'Aconitum_columbianum_6017.JPG',
      sourceLink: '../../wiki/File:Aconitum_columbianum_6017.JPG/index.html',
      semanticProperty: 'Has primary image',
      brokenFile: true,
      sourceLocation: {
        page: 'wiki/Aconitum_columbianum/index.html',
        section: 'Semantic facts',
        field: 'Has primary image'
      }
    });
  });

  it('combines a rendered image with its semantic provenance', () => {
    const $ = load(`
      <div id="article-image"><a class="image" href="/wiki/File:Akebia_quinata.jpg"><img alt="Akebia quinata.jpg" src="/w/images/3/3c/Akebia_quinata.jpg"></a></div>
      ${semanticFacts('Akebia quinata.jpg')}`);

    expect(extractPrimaryImage($, 'wiki/Akebia_quinata/index.html')).toMatchObject({
      filename: 'Akebia quinata.jpg',
      altText: 'Akebia quinata.jpg',
      sourceLink: '/wiki/File:Akebia_quinata.jpg',
      semanticProperty: 'Has primary image',
      brokenFile: false
    });
  });

  it('keeps the rendered-image fallback when no semantic fact exists', () => {
    const $ = load('<div id="article-image"><img alt="Fallback.jpg" src="/w/images/Fallback.jpg"></div>');
    expect(extractPrimaryImage($, 'wiki/Fallback/index.html')).toEqual({
      filename: 'Fallback.jpg',
      altText: 'Fallback.jpg',
      brokenFile: false
    });
  });
});

describe('optional primary image downloads', () => {
  it('stores resolved Commons links and downloads found images without failing missing ones', async () => {
    const source = { repository: 'test' };
    const base = { source, references: [], links: [] };
    const plant = (pageId: string, filename: string): PlantPage => ({
      ...base,
      identity: { pageId, title: pageId, pageType: 'plant', sourcePath: `wiki/${pageId}/index.html` },
      plant: { commonNames: [], image: { filename, brokenFile: true } },
      taxonomy: {}, fullData: {}, narrative: [], uses: [], useNotes: [], toxicity: []
    });
    const found = plant('Found', 'Found_image.jpg');
    const missing = plant('Missing', 'Missing_image.jpg');
    const pages = [found, missing];
    const imageBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith('https://commons.wikimedia.org/w/api.php')) return new Response(JSON.stringify({
        query: { pages: [
          { pageid: 1, title: 'File:Found image.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/Found_image.jpg?utm_source=test', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Found_image.jpg' }] },
          { pageid: -1, title: 'File:Missing image.jpg', missing: true }
        ] }
      }), { headers: { 'content-type': 'application/json' } });
      if (url === 'https://upload.wikimedia.org/Found_image.jpg') return new Response(imageBytes, { headers: { 'content-type': 'image/jpeg' } });
      return new Response(null, { status: 404 });
    };
    const output = await mkdtemp(join(tmpdir(), 'practicalplants-images-'));

    try {
      expect(await downloadPrimaryImages(pages, output, fetchMock as typeof fetch)).toEqual({
        requested: 2, resolved: 1, downloaded: 1, notFound: 1, failed: 0
      });
      expect(found.plant.image).toMatchObject({
        externalRepository: 'Wikimedia Commons',
        downloadUrl: 'https://upload.wikimedia.org/Found_image.jpg',
        descriptionUrl: 'https://commons.wikimedia.org/wiki/File:Found_image.jpg',
        localPath: 'images/Found_image.jpg',
        downloadStatus: 'downloaded'
      });
      expect(missing.plant.image?.downloadStatus).toBe('not_found');
      expect(new Uint8Array(await readFile(join(output, 'images', 'Found_image.jpg')))).toEqual(imageBytes);
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });
});

describe('non-plant observed structures', () => {
  it('classifies documentation namespaces', async () => {
    const { classifyPage } = await import('../src/classifier.js');
    const $ = load('<div id="article-title">Help</div><div id="mw-content-text"><h2>Contents</h2><p>Documentation</p></div>');
    expect(classifyPage($, 'wiki/Help:Contents/index.html', new Set())).toBe('documentation');
  });

  it('extracts common-name aliases', () => {
    const $ = load('<div id="article-title">Achira</div><div id="mw-content-text"><div id="article-summary">is a <a href="/wiki/Common_name">common name</a> for <a href="/wiki/Canna_edulis">Canna edulis</a>.</div></div>');
    const page = parseAlias($, 'Achira', 'wiki/Achira/index.html', 'Practical Plants recovered archive', undefined, new Set());
    expect(page.identity.pageType).toBe('alias');
    expect(page.alias.targets).toEqual(['Canna_edulis']);
    expect(page.links.find(link => link.targetPageId === 'Canna_edulis')?.resolved).toBe(false);
  });

  it('extracts family collections with absolute wiki URLs', () => {
    const $ = load('<div id="article-title">Aceraceae</div><div id="mw-content-text"><h2>Members of this family</h2><ul><li><a href="/wiki/Acer_acuminatum">Acer acuminatum</a></li></ul></div>');
    const page = parseCollection($, 'Aceraceae', 'wiki/Aceraceae/index.html', 'Practical Plants recovered archive', undefined, new Set(['Acer_acuminatum']), 'family');
    expect(page.collection.members).toEqual(['Acer_acuminatum']);
    expect(page.collection.completeness).toBe('populated');
    expect(page.collection.memberSource).toBe('archive_page');
  });

  it('preserves unresolved collection members and ignores secondary links', () => {
    const $ = load('<div id="article-title">Family</div><div id="mw-content-text"><h2>Members of this family</h2><ul><li><a href="/wiki/Missing_plant">Missing plant</a> (<a href="/wiki/Common_name">Name</a>)</li></ul></div>');
    const page = parseCollection($, 'Family', 'wiki/Family/index.html', 'Practical Plants recovered archive', undefined, new Set(['Common_name']), 'family');
    expect(page.collection.members).toEqual(['Missing_plant']);
    expect(page.collection.completeness).toBe('populated');
    expect(page.links.find(link => link.targetPageId === 'Missing_plant')?.resolved).toBe(false);
  });

  it('preserves empty generated collections', () => {
    const $ = load('<div id="article-title">Abortifacient</div><div id="mw-content-text"><h2>Plants with parts able to be used as an Abortifacient</h2></div>');
    const page = parseCollection($, 'Abortifacient', 'wiki/Abortifacient/index.html', 'Practical Plants recovered archive', undefined, new Set(), 'use');
    expect(page.collection.members).toEqual([]);
    expect(page.collection.completeness).toBe('empty');
    expect(page.collection.memberSource).toBe('archive_page');
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

describe('empty use collection recovery', () => {
  const source = { repository: 'test' };
  const base = { source, references: [], links: [] };

  function collection(pageId: string, title = pageId): CollectionPage {
    return { ...base, identity: { pageId, title, pageType: 'collection', sourcePath: `wiki/${pageId}/index.html` }, collection: { kind: 'use', members: [], completeness: 'empty', memberSource: 'archive_page' } };
  }

  function plant(pageId: string, uses: PlantPage['uses']): PlantPage {
    return { ...base, identity: { pageId, title: pageId, pageType: 'plant', sourcePath: `wiki/${pageId}/index.html` }, plant: { commonNames: [] }, taxonomy: {}, fullData: {}, narrative: [], uses, useNotes: [], toxicity: [] };
  }

  it('recovers members from plant parts, use labels, and linked use targets', () => {
    const seed = collection('Seed', 'Seeds');
    const wood = collection('Wood');
    const febrifuge = collection('Febrifuge');
    const pages = [
      seed,
      wood,
      febrifuge,
      plant('Alpha', [{ category: 'edible', plantPart: 'Seeds', references: [] }]),
      plant('Beta', [{ category: 'material', use: 'Wood', references: [] }]),
      plant('Gamma', [{ category: 'medicinal', use: 'Reduces fever', links: [{ href: '/wiki/Febrifuge', label: 'Reduces fever', targetPageId: 'Febrifuge', linkType: 'internal' }], references: [] }])
    ];

    expect(recoverEmptyUseCollections(pages)).toEqual({ collectionsRecovered: 3, membershipsRecovered: 3 });
    expect(seed.collection).toMatchObject({ members: ['Alpha'], completeness: 'populated', memberSource: 'plant_uses_inverse' });
    expect(wood.collection.members).toEqual(['Beta']);
    expect(febrifuge.collection.members).toEqual(['Gamma']);
  });

  it('keeps unmatched and already populated collections unchanged', () => {
    const unmatched = collection('Water_filter');
    const populated = collection('Wood');
    populated.collection = { kind: 'use', members: ['Existing'], completeness: 'populated', memberSource: 'archive_page' };
    const pages = [unmatched, populated, plant('New', [{ category: 'material', use: 'Wood', references: [] }])];

    expect(recoverEmptyUseCollections(pages)).toEqual({ collectionsRecovered: 0, membershipsRecovered: 0 });
    expect(unmatched.collection).toMatchObject({ members: [], completeness: 'empty', memberSource: 'archive_page' });
    expect(populated.collection.members).toEqual(['Existing']);
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
        <div id="article-summary">is a <a href="../../wiki/Common_name/index.html">common name</a> used for a number of distinct species.</div>
        <h2><span class="mw-headline">Plants with the <a href="../../wiki/Common_name/index.html">common name</a> Abutilon</span></h2>
        <div><ul><li><a href="../../wiki/Abutilon_megapotamicum/index.html">Abutilon megapotamicum</a></li></ul></div>
      </div>`);
    const pageIds = new Set(['Common_name', 'A-Z_of_common_names', 'Trailing_Abutilon']);
    expect(classifyPage($, 'wiki/Abutilon/index.html', pageIds)).toBe('index');
    const page = parseIndex($, 'Abutilon', 'wiki/Abutilon/index.html', 'Practical Plants recovered archive', undefined, pageIds);
    expect(page.index.members).toEqual(['Abutilon_megapotamicum']);
    expect(page.links.find(link => link.targetPageId === 'Abutilon_megapotamicum')?.resolved).toBe(false);
  });

  it('classifies namespaced polyculture pages without mistaking their summary plants for the page type', () => {
    const polyculture = load(`
      <header id="page-header" class="with-image">
        <h1 id="article-title">Polyculture:Three sisters</h1>
        <div id="article-summary">A polyculture comprising of
          <a href="/wiki/Zea_mays"><span class="plant-name"><em class="binomial">Zea mays</em></span></a>
        </div>
      </header>
      <div id="mw-content-text"><h2>Polyculture members</h2></div>`);
    expect(classifyPage(polyculture, 'wiki/Polyculture:Three_sisters/index.html')).toBe('polyculture');

    const legacyPath = load(`
      <header id="page-header" class="with-image">
        <h1 id="article-title">Polyculture:Sunchoke and Hog Peanut</h1>
        <div id="article-summary">A polyculture comprising of
          <a href="/wiki/Helianthus_tuberosus"><span class="plant-name"><em class="binomial">Helianthus tuberosus</em></span></a>
        </div>
      </header>
      <div id="mw-content-text"><h2>Polyculture members</h2></div>`);
    expect(classifyPage(legacyPath, 'wiki/Sunchoke-hog_peanut/index.html')).toBe('unknown');
  });

  it('extracts polyculture member roles and narrative with links, citations, and provenance', () => {
    const $ = load(`
      <header id="page-header">
        <h1 id="article-title">Polyculture:Three sisters</h1>
        <div id="article-summary"><p>A <a href="/wiki/Polyculture">polyculture</a> comprising of <a href="/wiki/Zea_mays">Zea mays</a>.</p></div>
      </header>
      <div id="mw-content-text">
        <h2><span class="mw-headline" id="Polyculture_members">Polyculture members</span></h2>
        <div class="orange tbl">
          <div class="row"><div class="heading">Species</div><div class="heading">Ecosystem Niche/Layer</div><div class="heading">Function(s)</div><div class="heading">Use(s)</div></div>
          <span class="row">
            <span class="cell"><a href="/wiki/Zea_mays"><span class="plant-name"><em class="binomial">Zea mays</em></span></a><span class="common-name"> (Maize, Sweet Corn)</span></span>
            <span class="cell"><a href="/wiki/Herbaceous">Herbaceous</a></span>
            <span class="cell"><a href="/wiki/Structure">Structure</a></span>
            <span class="cell"><a class="new" href="/w/index.php?title=Edible_crop&amp;action=edit&amp;redlink=1">Edible crop</a></span>
          </span>
        </div>
        <h2><span class="mw-headline" id="History_and_method">History and method</span></h2>
        <p>The crops are <a href="/wiki/Intercropping">planted together</a>.<sup class="reference"><a href="#cite_note-wiki1-1">[1]</a></sup></p>
        <div class="article-section" id="article-references"><h2>References</h2><ol class="references"><li id="cite_note-wiki1-1"><span class="reference-text">Example source</span></li></ol></div>
      </div>`);
    const pageIds = new Set(['Polyculture', 'Zea_mays', 'Herbaceous', 'Structure', 'Intercropping']);
    const page = parsePolyculture($, 'Polyculture:Three_sisters', 'wiki/Polyculture:Three_sisters/index.html', 'test', 'abc', pageIds);

    expect(page.identity.pageType).toBe('polyculture');
    expect(page.polyculture.members).toHaveLength(1);
    expect(page.polyculture.members[0]).toMatchObject({
      plant: { name: 'Zea mays', pageId: 'Zea_mays', commonNames: ['Maize', 'Sweet Corn'] },
      ecosystemNiches: { text: 'Herbaceous' },
      functions: { text: 'Structure' },
      uses: { text: 'Edible crop' },
      sourceLocation: { page: 'wiki/Polyculture:Three_sisters/index.html', section: 'Polyculture members', field: 'row 1' }
    });
    expect(page.polyculture.members[0].uses.links[0]).toMatchObject({ targetPageId: 'Edible_crop', redLink: true, resolved: false });
    expect(page.polyculture.narrative).toEqual([expect.objectContaining({
      id: 'History_and_method',
      title: 'History and method',
      paragraphs: ['The crops are planted together.[1]'],
      references: ['wiki1-1'],
      links: [expect.objectContaining({ targetPageId: 'Intercropping', resolved: true })],
      sourceLocation: { page: 'wiki/Polyculture:Three_sisters/index.html', section: 'History and method' }
    })]);
    expect(page.references).toEqual([expect.objectContaining({ id: 'cite_note-wiki1-1', rawText: 'Example source' })]);
    expect(() => validatePage(page)).not.toThrow();
  });

  it('puts unheaded polyculture prose into an overview narrative section', () => {
    const $ = load(`
      <h1 id="article-title">Polyculture:Sunchoke and Hog Peanut</h1>
      <div id="mw-content-text">
        <h2><span id="Polyculture_members">Polyculture members</span></h2>
        <div class="tbl"><span class="row"><span class="cell"><a href="/wiki/Helianthus_tuberosus"><span class="plant-name">Helianthus tuberosus</span></a></span><span class="cell">Canopy</span><span class="cell">Living trellis</span><span class="cell">Edible tubers</span></span></div>
        <p>Both species can handle each other because they occupy distinct layers.</p>
      </div>`);
    const page = parsePolyculture($, 'Polyculture:Sunchoke_and_Hog_Peanut', 'wiki/Polyculture:Sunchoke_and_Hog_Peanut/index.html', 'test', undefined, new Set(['Helianthus_tuberosus']));
    expect(page.polyculture.narrative).toEqual([expect.objectContaining({ id: 'overview', title: 'Overview', paragraphs: ['Both species can handle each other because they occupy distinct layers.'] })]);
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
