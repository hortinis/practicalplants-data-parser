# Practical Plants Data Parser

Offline TypeScript/Node.js parser for the recovered Practical Plants archive.

## Scope

This project recovers structured information from an already-cloned Practical Plants archive. By default it does **not** clone, download, enrich, canonicalize, or query external plant/taxonomy sources. The optional `--download-images` mode queries Wikimedia Commons only for image filenames already preserved by the archive.

The source archive is immutable input. Run the parser with a local checkout:

```bash
npm install
npm run check
npm run parse -- /path/to/practicalplants-archive.org-recovery --output ./output
```

Image binaries remain opt-in because normal parsing is offline. To resolve preserved filenames against Wikimedia Commons, store the resolved links in each `plant.image` record, and download found files into `output/images/`, run:

```bash
npm run parse -- /path/to/practicalplants-archive.org-recovery --output ./output --download-images
```

For each resolved image, `plant.image.downloadUrl` stores the direct binary URL, `descriptionUrl` stores its Wikimedia Commons file-description page, and `localPath` points to the downloaded file. The manifest reports requested, resolved, downloaded, missing, and failed image counts. A failed image lookup or download does not abort recovery of the remaining archive.

## Output

```text
output/
  images/                 # only with --download-images
  pages/
    plant/
    alias/
    collection/
    concept/
    polyculture/
    index/
    documentation/
    unknown/
  manifest.json
  errors.json
```

One JSON file is emitted per scanned page. Unknown pages are retained.

Common-name alias pages are emitted under `alias/`. Family, usage (including plant-part and animal-forage lists), category and catalogue list pages are emitted under `collection/`; genus lists remain under `index/` for backward compatibility. Collections include `completeness: "populated"` or `"empty"` so an empty generated list is not confused with a parser failure. Their `memberSource` distinguishes lists read from the archive page from empty use lists reconstructed through inverse relationships in plant `uses` records.

Help, template, category, concept, form, property, discussion, user and Practical Plants administration pages are emitted under `documentation/` for classification purposes.

## Observed archive structures

The initial extraction rules are based on inspection of representative recovered pages including `Solanum_lycopersicum`, `Acacia_aneura`, `Abies_amabilis`, `Abies_homolepis`, `Abies`, and `Canopy`.

Important observed selectors include:

- `#article-title`, `.binomial`, `#common-name`, `#article-summary`
- `#plant-datatable` and nested `.infobox-section`, `.infobox-subsection`, `.infobox-title`, `.infobox-content`
- `.toxicpart`, `.toxicpart-compounds`, `.toxicpart-toxicity`
- `#plant-edible-uses`, `#plant-material-uses`, `#plant-medicinal-uses`
- category-level `.pfaf-notes` use prose, with links and citation identifiers
- `.plant-uses`, `.plant-use-list`, `.plant-use-list-item`
- `ol.references > li`
- `.category-plant-item` on genus/index pages
- `Plants inhabiting this ecosystem niche` on concept pages
- `#Polyculture_members` and `.tbl > .row > .cell` on polyculture pages

The parser still treats the full corpus as authoritative: additional structures discovered during a complete corpus run should become regression fixtures and may require schema evolution.

## Design principles

- Recover first, normalize second, integrate later.
- Preserve raw source values and important missing-value states.
- Normalize only when mechanically reliable.
- Preserve unresolved/red links.
- Preserve page-level and citation-level provenance.
- Continue after individual page failures.
- Produce deterministic output.
- JSON Schema is the schema source of truth.
- No network access is required by the parser.

## Full-corpus validation findings

A full recovered-archive run completed with 11,019 parsed pages and 0 parser errors. The run exposed several corpus-wide fidelity issues that are now addressed in the parser:

- MediaWiki `w/index.php?title=...` links, including `redlink=1` edit URLs, are parsed as wiki links and retain the target page identity and red-link state.
- The recovered site's root links (`../../wiki//index.html` and `/wiki/`) resolve to the root page identifier `.` rather than the synthetic page `index`.
- Index/list detection is based on collection headings plus actual list links, avoiding false positives for descriptive pages such as `Acid_loving`.
- Index members are collected from list links and filtered against the scanned page set, so structures such as common-name indexes are supported in addition to genus indexes.
- Repeated Full Data field labels are accumulated rather than overwritten. This preserves duplicate source fields such as repeated `Cultivation` entries.
- Narrative and Full Data links use the same link parser, preserving wiki target identity and red-link information. Use records likewise retain their links.
- Detailed edible, material, and medicinal prose is retained separately in plant `useNotes`, preserving its category, links, citation markers, and source location without duplicating category-level notes across individual use labels.
- Empty generated use collections are reconstructed after the corpus is parsed by matching their page identity to plant parts, use labels, and linked use targets. Recovered lists are marked with `memberSource: "plant_uses_inverse"`; unmatched collections remain explicitly empty.
- Primary-image filenames are recovered from Semantic MediaWiki's `Has primary image` facts when the archived page lacks an image element. Image records preserve the semantic property and source location, the archived file-page link when available, and whether the image was broken in the recovered rendering.
- Namespaced polyculture pages are emitted under `polyculture/`. Each member retains its plant identity and common names plus the ecosystem-niche, function, and use cells with their links; prose is grouped into narrative sections with citation identifiers and source locations.

The source archive contains generated MediaWiki list/index pages in addition to plant pages. For example, `Abutilon` has a `Plants with the common name Abutilon` collection and three plant entries, while `Abies` uses `Plants in the Abies genus`. These are both index structures. Descriptive pages without an actual collection remain eligible for `unknown`.

The parser remains offline and does not use external taxonomy or biological enrichment.

## Limitations still requiring corpus validation

The six representative pages are enough to replace the initial selector assumptions, but a full archive run is still required to measure variation in:

- unusual Full Data fields and nesting
- narrative markup
- citation/reference variants
- malformed HTML and recovery artifacts
- image markup
- page classification edge cases
- internal URL variants
- old revision metadata

Do not use this parser as a canonical botanical model or as an enriched taxonomy database.
