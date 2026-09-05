import type { CollectionPage, PlantPage, PPPage } from '../model/types.js';

export interface FunctionCollectionRecoveryStats { directCollectionsRecovered: number; directMembershipsRecovered: number; derivedCollectionsRecovered: number; derivedMembershipsRecovered: number; }
const key = (value: string) => value.normalize('NFKC').replaceAll('_', ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
const plants = (pages: PPPage[]) => pages.filter((p): p is PlantPage => p.identity.pageType === 'plant');
const catalogs = (pages: PPPage[]) => pages.filter((p): p is CollectionPage => p.identity.pageType === 'collection' && p.collection.kind === 'catalog' && p.collection.completeness === 'empty');

export function recoverFunctionCollections(pages: PPPage[]): FunctionCollectionRecoveryStats {
  const direct = new Map<string, Set<string>>();
  for (const plant of plants(pages)) for (const fn of plant.ecology?.functions ?? []) {
    const target = key(fn.link.targetPageId || fn.name);
    const set = direct.get(target) ?? new Set<string>(); set.add(plant.identity.pageId); direct.set(target, set);
  }
  let directCollectionsRecovered = 0, directMembershipsRecovered = 0;
  const unresolved: CollectionPage[] = [];
  for (const collection of catalogs(pages)) {
    const members = direct.get(key(collection.identity.pageId)) ?? direct.get(key(collection.identity.title));
    if (!members?.size) { unresolved.push(collection); continue; }
    collection.collection.members = [...members].sort(); collection.collection.completeness = 'populated'; collection.collection.memberSource = 'plant_ecology_inverse';
    directCollectionsRecovered++; directMembershipsRecovered += members.size;
  }
  let derivedCollectionsRecovered = 0, derivedMembershipsRecovered = 0;
  for (const collection of unresolved) {
    const parts = collection.identity.pageId.split(',').map(key).filter(Boolean);
    if (parts.length < 2) continue;
    const sets = parts.map(part => direct.get(part));
    if (sets.some(set => !set?.size)) continue;
    const members = [...sets[0]!].filter(member => sets.every(set => set!.has(member))).sort();
    if (!members.length) continue;
    collection.collection.members = members; collection.collection.completeness = 'populated'; collection.collection.memberSource = 'derived_function_intersection'; collection.collection.memberDerivation = { operation: 'intersection', functions: parts };
    derivedCollectionsRecovered++; derivedMembershipsRecovered += members.length;
  }
  return { directCollectionsRecovered, directMembershipsRecovered, derivedCollectionsRecovered, derivedMembershipsRecovered };
}
