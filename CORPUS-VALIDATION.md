# Full Corpus Validation Report

Date: 2026-09-03

## Baseline

The recovered archive parser run completed with:

- 11,019 parsed pages
- 0 parser errors
- 6,225 plant pages
- 1,086 index pages
- 8 concept pages
- 3,700 unknown pages

The source is the recovered Practical Plants archive. Validation follows the project principle: **recover first, normalize second, integrate later**.

## Findings

### High: MediaWiki red-link URLs

The archive uses links such as `/w/index.php?title=PH_scale&action=edit&redlink=1`, often with MediaWiki's `new` CSS class. These must be treated as wiki links, not generic external URLs. The parser now extracts `targetPageId=PH_scale` and preserves `redLink=true`, while retaining the original `href`.

### High: incomplete index classification

`Abies` is a genus index, but `Abutilon` is also an index: its source contains the heading `Plants with the common name Abutilon` followed by list entries for three plant pages. Index detection is now based on collection headings plus actual list links rather than only the genus wording.

Descriptive pages without an actual collection are not promoted solely because their heading begins with `Plants ...`.

### Medium: root links

The recovered site uses both `../../wiki//index.html` and `/wiki/` for the site root. Both now normalize to the root target `.` rather than the synthetic target `index`.

### Medium: duplicate Full Data labels

Full Data is represented as a section -> field -> array structure. Repeated source field labels must accumulate their values instead of overwriting an earlier occurrence. The parser now appends repeated field values.

### Medium: nested link fidelity

Full Data, narrative, and use links now share the same wiki-link parsing rules, so relative wiki links and MediaWiki `w/index.php` links retain target identity and red-link state consistently.

## Reference handling

Bibliography records remain keyed by their actual `cite_note-*` DOM IDs. Citation occurrences continue to preserve their occurrence IDs derived from the citation anchors. The parser does not deduplicate repeated citation occurrences in narrative text.

## Determinism

The output writer recursively sorts object keys and the scanner/parser sort page collections before writing. A full second archive execution should still be run in the target environment to perform the required byte-for-byte comparison.

## Validation limitation

The source package was inspected and modified successfully, but this execution environment could not complete dependency installation from npm, so the project's `npm run check` could not be rerun end-to-end here. TypeScript source files were syntax-checked with the installed TypeScript compiler and no syntax diagnostics were produced.

The final acceptance run should therefore be:

```bash
npm install
npm run check
npm run parse -- /path/to/practicalplants-archive.org-recovery --output ./output
npm run parse -- /path/to/practicalplants-archive.org-recovery --output ./output-second
cmp -s ./output/manifest.json ./output-second/manifest.json
# and byte-compare the pages directories
```

## Regression coverage added

- MediaWiki red-link target extraction
- site-root link normalization
- common-name collection/index classification
- repeated Full Data field preservation
- links retained in use records
