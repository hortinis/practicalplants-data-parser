export type PageType = 'plant' | 'concept' | 'index' | 'unknown';
export type ValueStatus = 'known' | 'unknown' | 'none_listed' | 'empty';

export interface SourceLocation {
  page: string;
  section?: string;
  field?: string;
}

export interface LinkRecord {
  href: string;
  label: string;
  targetPageId?: string;
  linkType: 'internal' | 'external' | 'unknown';
  resolved?: boolean;
}

export interface FieldValue {
  rawValue: string;
  normalizedValue?: unknown;
  status: ValueStatus;
  links: LinkRecord[];
  sourceLocation?: SourceLocation;
}

export interface UseRecord {
  category: 'edible' | 'material' | 'medicinal';
  plantPart?: string;
  use?: string;
  text?: string;
  references: string[];
  sourceLocation?: SourceLocation;
}

export interface ToxicityRecord {
  plantParts: string[];
  compound?: string;
  severity?: string;
  description?: string;
  references: string[];
  sourceLocation?: SourceLocation;
}

export interface NarrativeSection {
  id: string;
  title: string;
  paragraphs: string[];
  lists: string[][];
  links: LinkRecord[];
  references: string[];
  sourceLocation: SourceLocation;
}

export interface ReferenceRecord {
  id: string;
  rawText: string;
  author?: string;
  title?: string;
  publisher?: string;
  date?: string;
  isbn?: string;
  urls: string[];
}

export interface PPPageBase {
  identity: {
    pageId: string;
    title: string;
    pageType: PageType;
    sourcePath: string;
  };
  source: {
    repository: string;
    commit?: string;
  };
  references: ReferenceRecord[];
  links: LinkRecord[];
}

export interface PlantPage extends PPPageBase {
  identity: PPPageBase['identity'] & { pageType: 'plant' };
  plant: {
    scientificName?: string;
    commonNames: string[];
    summary?: string;
    image?: { filename?: string; caption?: string; altText?: string; sourceLink?: string };
  };
  taxonomy: {
    binomialName?: string;
    genus?: string;
    family?: string;
  };
  fullData: Record<string, Record<string, FieldValue[]>>;
  narrative: NarrativeSection[];
  uses: UseRecord[];
  toxicity: ToxicityRecord[];
}

export interface ConceptPage extends PPPageBase {
  identity: PPPageBase['identity'] & { pageType: 'concept' };
  concept: { description?: string; members: string[] };
}

export interface IndexPage extends PPPageBase {
  identity: PPPageBase['identity'] & { pageType: 'index' };
  index: { description?: string; members: string[] };
}

export interface UnknownPage extends PPPageBase {
  identity: PPPageBase['identity'] & { pageType: 'unknown' };
  unknown: { headings: string[]; text?: string };
}

export type PPPage = PlantPage | ConceptPage | IndexPage | UnknownPage;

export interface ParseError {
  sourcePath: string;
  error: string;
  severity: 'warning' | 'error';
}
