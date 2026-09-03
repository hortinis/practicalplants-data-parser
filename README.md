# Practical Plants Data Parser

Offline TypeScript/Node.js parser for the recovered Practical Plants archive.

## Status

The real `practicalplants-archive.org-recovery` repository was **not available in the execution environment**, so this first implementation provides the repository scaffold, typed source model, conservative scanner/classifier, initial extraction modules, JSON Schema validation, deterministic output, and representative fixtures. The exact HTML selectors and extraction rules must be validated and refined against the real archive before a corpus-wide run.

## Principles

- The archive is local input; the parser never clones or downloads it.
- No external taxonomy or enrichment calls.
- Unknown pages are retained.
- Source semantics such as `?`, `None listed.`, and empty fields remain distinct.
- Raw HTML is not copied into generated page JSON.
- JSON Schema is the contract; TypeScript interfaces mirror the initial model.
- Output is one JSON file per page plus a manifest and errors file.

## Install

```bash
npm install
```

## Run

```bash
npm run parse -- /path/to/practicalplants-archive.org-recovery --output ./output
```

The input must contain a `wiki/` directory. The parser attempts to record `git rev-parse HEAD` from that checkout.

## Test and type-check

```bash
npm test
npm run build
npm run check
```

## Output

```text
output/
├── pages/
│   ├── plant/
│   ├── concept/
│   ├── index/
│   └── unknown/
├── manifest.json
└── errors.json
```

## Current validation requirements

Before declaring V1 complete, inspect real examples including:

- `wiki/Solanum_lycopersicum/index.html`
- `wiki/Acacia_aneura/index.html`
- `wiki/Abies_amabilis/index.html`
- `wiki/Abies_homolepis/index.html`
- `wiki/Abies/index.html`
- `wiki/Canopy/index.html`

Then refine Full Data hierarchy extraction, narrative boundaries, citations, toxicity/use structures, image handling, old revision metadata, internal link resolution, and concept/index classification based on observed corpus variation.

## Important limitation

The initial schemas are intentionally small and the parser contains representative, conservative heuristics. They are not claimed to be a complete reproduction of the archive until tested against the actual corpus. The next implementation step should be corpus inspection and regression-fixture expansion, not external enrichment.
