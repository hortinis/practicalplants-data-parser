# Practical Plants Data Parser

Offline TypeScript/Node.js parser for the recovered Practical Plants archive.

## Scope

This project recovers structured information from an already-cloned Practical Plants archive. It does **not** clone, download, enrich, canonicalize, or query external plant/taxonomy sources.

The source archive is immutable input. Run the parser with a local checkout:

```bash
npm install
npm run check
npm run parse -- /path/to/practicalplants-archive.org-recovery --output ./output
```

## Output

```text
output/
  pages/
    plant/
    concept/
    index/
    unknown/
  manifest.json
  errors.json
```

One JSON file is emitted per scanned page. Unknown pages are retained.

## Observed archive structures

The initial extraction rules are based on inspection of representative recovered pages including `Solanum_lycopersicum`, `Acacia_aneura`, `Abies_amabilis`, `Abies_homolepis`, `Abies`, and `Canopy`.

Important observed selectors include:

- `#article-title`, `.binomial`, `#common-name`, `#article-summary`
- `#plant-datatable` and nested `.infobox-section`, `.infobox-subsection`, `.infobox-title`, `.infobox-content`
- `.toxicpart`, `.toxicpart-compounds`, `.toxicpart-toxicity`
- `#plant-edible-uses`, `#plant-material-uses`, `#plant-medicinal-uses`
- `.plant-uses`, `.plant-use-list`, `.plant-use-list-item`
- `ol.references > li`
- `.category-plant-item` on genus/index pages
- `Plants inhabiting this ecosystem niche` on concept pages

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
