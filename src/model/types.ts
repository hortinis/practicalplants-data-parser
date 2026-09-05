export type PageType = 'plant' | 'alias' | 'collection' | 'concept' | 'polyculture' | 'interaction' | 'index' | 'documentation' | 'unknown';
export type ValueStatus = 'known' | 'unknown' | 'none_listed' | 'empty';
export type LinkType = 'internal' | 'external' | 'unknown';

export interface SourceLocation { page: string; section?: string; field?: string; }
export interface LinkRecord { href: string; label: string; targetPageId?: string; linkType: LinkType; resolved?: boolean; redLink?: boolean; }
export interface CategoryMembership { categoryPageId: string; name: string; hidden: boolean; link: LinkRecord; sourceLocation: SourceLocation; }
export interface FieldValue { rawValue: string; normalizedValue?: unknown; status: ValueStatus; links: LinkRecord[]; sourceLocation?: SourceLocation; }
export interface UseRecord { category: 'edible' | 'material' | 'medicinal'; plantPart?: string; use?: string; text?: string; links?: LinkRecord[]; references: string[]; sourceLocation?: SourceLocation; }
export interface UseNoteRecord { category: 'edible' | 'material' | 'medicinal'; text: string; links: LinkRecord[]; references: string[]; sourceLocation: SourceLocation; }
export interface ToxicityRecord { plantParts: string[]; compound?: string; severity?: string; description?: string; references: string[]; sourceLocation?: SourceLocation; }
export interface NarrativeSection { id: string; title: string; paragraphs: string[]; lists: string[][]; links: LinkRecord[]; references: string[]; sourceLocation: SourceLocation; }
export interface ReferenceRecord { id: string; rawText: string; author?: string; title?: string; publisher?: string; date?: string; isbn?: string; urls: string[]; }
export interface ImageInfo { filename: string; caption?: string; altText?: string; sourceLink?: string; semanticProperty?: 'Has primary image'; brokenFile: boolean; sourceLocation?: SourceLocation; externalRepository?: 'Wikimedia Commons'; downloadUrl?: string; descriptionUrl?: string; localPath?: string; downloadStatus?: 'downloaded' | 'not_found' | 'failed'; }
export interface PPPageBase { identity: { pageId: string; title: string; pageType: PageType; sourcePath: string }; source: { repository: string; commit?: string }; references: ReferenceRecord[]; links: LinkRecord[]; categories: CategoryMembership[]; }
export interface PlantPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'plant' }; plant: { scientificName?: string; commonNames: string[]; summary?: string; image?: ImageInfo }; taxonomy: { binomialName?: string; genus?: string; family?: string }; fullData: Record<string, Record<string, FieldValue[]>>; narrative: NarrativeSection[]; uses: UseRecord[]; useNotes: UseNoteRecord[]; toxicity: ToxicityRecord[]; }
export interface ConceptPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'concept' }; concept: { description?: string; members: string[] }; }
export interface IndexPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'index' }; index: { description?: string; members: string[] }; }
export interface AliasPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'alias' }; alias: { kind: 'common_name' | 'synonym' | 'redirect' | 'unknown'; description?: string; targets: string[] }; }
export interface CollectionPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'collection' }; collection: { kind: 'family' | 'genus' | 'use' | 'category' | 'catalog' | 'unknown'; description?: string; members: string[]; completeness: 'populated' | 'empty'; memberSource: 'archive_page' | 'plant_uses_inverse' | 'category_membership_inverse'; subcategories?: string[]; totalMembers?: number; membersComplete?: boolean }; }
export interface PolycultureMemberField { text: string; links: LinkRecord[]; }
export interface PolycultureMember { plant: { name: string; pageId?: string; commonNames: string[]; links: LinkRecord[] }; ecosystemNiches: PolycultureMemberField; functions: PolycultureMemberField; uses: PolycultureMemberField; sourceLocation: SourceLocation; }
export interface PolyculturePage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'polyculture' }; polyculture: { description?: string; members: PolycultureMember[]; narrative: NarrativeSection[] }; }
export interface InteractionField { text: string; links: LinkRecord[]; references: string[]; sourceLocation: SourceLocation; }
export interface InteractionMember { name: string; pageId?: string; links: LinkRecord[]; sourceLocation: SourceLocation; }
export interface InteractionPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'interaction' }; interaction: { description?: string; leftMember: InteractionMember; rightMember: InteractionMember; direction: InteractionField; effect: InteractionField; impact: InteractionField; details: InteractionField }; }
export interface DocumentationPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'documentation' }; documentation: { namespace?: string; headings: string[]; text?: string }; }
export interface UnknownPage extends PPPageBase { identity: PPPageBase['identity'] & { pageType: 'unknown' }; unknown: { headings: string[]; text?: string }; }
export type PPPage = PlantPage | AliasPage | CollectionPage | ConceptPage | PolyculturePage | InteractionPage | IndexPage | DocumentationPage | UnknownPage;
export interface ParseError { sourcePath: string; error: string; severity: 'warning' | 'error'; }
