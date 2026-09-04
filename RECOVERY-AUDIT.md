# Recovery audit: `output3` versus the archive

This audit compares `output3` with commit `f127c411b057339b75b2cbd8d01efdb14869760d` of the recovered Practical Plants archive. It records data that is missing from the structured output or retained only in a less useful form.

## 1. Detailed plant-use notes are omitted

**Priority:** High

The parser extracts use labels such as `Wood`, `Tea`, and `Antiseptic`, but it does not retain the accompanying edible, material, and medicinal prose in `.pfaf-notes` blocks. These notes often contain preparation instructions, traditional uses, warnings, quantities, and important context that cannot be reconstructed from the use label alone.

Observed scope:

- 6,023 plant pages contain at least one omitted detailed-use note.
- 4,811 pages contain edible-use notes.
- 3,302 pages contain material-use notes.
- 3,455 pages contain medicinal-use notes.
- The archive contains 11,568 relevant note blocks and 57,090 citation markers within them.

The bibliography entries themselves usually remain in `references`, but the note text and its direct association with those citations are lost.

**Recoverable data:** note category, prose, internal and external links, citation identifiers, and source location.

## 2. Empty use collections can mostly be reconstructed

**Priority:** High

`output3` marks 246 use collections as `completeness: "empty"`. The generated archive pages are empty, but the corresponding plant records usually contain the inverse relationship in their `uses` arrays.

Observed scope:

- 241 of the 246 empty use collections have recoverable members.
- Approximately 14,997 plant-to-use memberships can be reconstructed.
- Examples include `Seed` with 1,206 plants, `Wood` with 845 plants, and `Febrifuge` with 565 plants.

Collections with no direct inverse match in the current output are `Bumble_bees`, `Dysmenorrhea`, `Fried`, `Gelatine`, and `Water_filter`.

**Recoverable data:** collection member lists derived from plant use, plant-part, and linked-use records.

## 3. Primary-image filenames are omitted

**Priority:** High

The archive contains Semantic MediaWiki `Has primary image` facts for 2,424 plant pages, while only 75 parsed plant records have a `plant.image` object. Of the pages with a semantic primary-image fact, 2,398 lack a parsed image record.

The archive does not contain the corresponding plant image binaries, so the images themselves cannot be restored from this checkout. However, their filenames and broken-file status remain useful provenance and may support recovery from another source.

**Recoverable data:** original filename, semantic property, page association, and broken-file indication.

## 4. Polyculture pages are not parsed structurally

**Priority:** High

The following pages are classified as `unknown` and retained mainly as flattened text:

- `Polyculture:Three_sisters`
- `Polyculture:Sunchoke_and_Hog_Peanut`

Their archive HTML contains structured member tables. Flattening loses the association between each species and its ecosystem niche, functions, uses, and other row-level fields.

**Recoverable data:** polyculture identity, member plants, row-level ecosystem niches, functions, uses, narrative sections, links, and citations.

## 5. Interaction pages are not parsed structurally

**Priority:** High

`Interaction:Cucurbita-Zea_mays-1` is classified as `unknown`. Its archive page contains a structured plant interaction, including details, direction, and effect.

**Recoverable data:** left and right members, direction, effect or impact, details, links, and provenance.

## 6. Category membership is not modeled

**Priority:** Medium

All 29 `Category:*` pages are classified as documentation. At least 27 contain headings indicating member or subcategory lists, but their contents are stored as flattened documentation text rather than structured collections.

In addition, all 11,019 archived wiki pages contain a `#catlinks` area. The current generic link list preserves many category links but does not distinguish category membership from navigation and article links.

**Recoverable data:** page-to-category relationships, category members, subcategories, hidden categories, and membership provenance.

## 7. Semantic MediaWiki fact tables are not parsed

**Priority:** Medium

Semantic fact tables occur on 5,612 archived pages. Much of this data duplicates visible plant fields and can be used for validation, while some properties have no equivalent in `output3`.

Notable recoverable properties include:

- article incomplete, cleanup, and citation-required flags on approximately 5,608 pages;
- PFAF migration-status flags on 3,476 pages;
- ecological function relationships on 1,203 pages;
- seed stratification and scarification flags on 123 pages;
- forage and shelter relationships;
- crop relationships;
- native geographical range and environment;
- taxonomy rank and cultivar relationships;
- semantic image filenames.

**Recoverable data:** property name, one or more values, links, source page, and enough provenance to distinguish semantic facts from visible infobox fields.

## 8. Revision and historical page metadata are omitted

**Priority:** Medium

The archive retains MediaWiki provenance that is not represented in each output page's `source` object.

Observed scope:

- revision URLs and `oldid` values on 11,000 pages;
- last-modified timestamps on 11,000 pages;
- historical access counts on 10,867 pages.

These values are useful for traceability, resolving duplicated or redirected pages, and assessing the historical state of the recovered corpus.

**Recoverable data:** revision ID, canonical revision URL, last-modified timestamp, and access count.

## 9. Some empty function catalogs have recoverable members

**Priority:** Medium

Several function-related collections are empty even though plant pages retain matching ecology links:

- `Fumigant`: `Brassica_nigra`, `Sinapis_alba`
- `Repellant`: `Brassica_juncea`
- `Biogenic_Decalcifier/Pioneer_Species`: `Elodea_canadensis`

`Pioneer,Nitrogen_Fixer` is also empty. Its intended membership may be reconstructable as the intersection of the two individual function relationships, but that interpretation should be explicitly marked as derived because the archived page itself supplies no member list.

**Recoverable data:** direct function memberships from ecology links and, separately, explicitly derived compound-function memberships.

## 10. Redirect and synonym relationships are not modeled

**Priority:** Medium

All 2,784 alias records use `kind: "common_name"`; no records use the available `redirect`, `synonym`, or `unknown` kinds. Some recovered routes render another page's canonical content and are currently classified as `unknown` rather than redirects.

Confirmed examples:

- `Intercropping` redirects to or resolves as `Polyculture`.
- `Sunchoke-hog_peanut` redirects to or resolves as `Polyculture:Sunchoke and Hog Peanut`.

Other redirect and synonym cases may be detectable from requested page IDs, rendered titles, canonical revision URLs, and identical or near-identical article bodies.

**Recoverable data:** source page ID, canonical target, relationship kind, and confidence or evidence.

## 11. Substantive non-plant articles are retained only as `unknown`

**Priority:** Medium

Several useful knowledge pages are classified as `unknown`. Their text is retained, but their section structure and semantic role are not represented.

Notable pages include:

- `Agroforestry`
- `Commons`
- `Crop_redundancy`
- `Guild`
- `Honey_fungus`
- `Medicinal_uses`
- `Monoculture`
- `Polyculture`
- `Species_naming_conventions`
- `Use`
- `Browse`
- `Practical_Plants`

**Recoverable data:** article type, ordered sections, paragraphs, lists, links, citations, and cross-references.

## 12. Unknown pages contain noise and should not all be promoted

**Priority:** Low

Some `unknown` pages appear to be spam, obsolete forms, empty terms, or failed generated queries. They should be separated from recoverable editorial content rather than treated as equivalent knowledge pages.

Examples include:

- likely spam: `Careless_Weed`, `MikeAdler948`;
- editing interface: `Edit_new_article_with_wikitext`;
- failed or malformed generated output: `Aquatic`;
- effectively empty pages such as `Darning_ball`, `Microscope`, and `Porcelain`.

**Recoverable data:** classification and preservation status; these pages generally do not justify richer domain modeling.

## Coverage observations

- `output3` contains 11,019 page JSON files and reports zero parser errors.
- Its recorded source commit matches the archive commit used for this audit.
- All 11,019 legitimate archived wiki pages are represented.
- The five HTML files intentionally outside that page set are the root `404.html` and four bundled font demonstration pages.
- The principal recovery opportunity is therefore content fidelity and richer structure, not discovering additional wiki page files.
