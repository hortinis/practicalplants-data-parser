import type { CollectionPage, PlantPage, PPPage } from '../model/types.js';

export interface UseCollectionRecoveryStats {
  collectionsRecovered: number;
  membershipsRecovered: number;
}

function matchKey(value: string | undefined): string | undefined {
  const normalized = value?.normalize('NFKC').replaceAll('_', ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
  return normalized || undefined;
}

function isEmptyUseCollection(page: PPPage): page is CollectionPage {
  if (page.identity.pageType !== 'collection') return false;
  const collection = page as CollectionPage;
  return collection.collection.kind === 'use' && collection.collection.completeness === 'empty';
}

function isPlant(page: PPPage): page is PlantPage {
  return page.identity.pageType === 'plant';
}

/**
 * Generated use pages can have empty member lists even though plant pages retain
 * the inverse relationship. Recover only those empty lists and mark their origin.
 */
export function recoverEmptyUseCollections(pages: PPPage[]): UseCollectionRecoveryStats {
  const collectionsByKey = new Map<string, CollectionPage[]>();
  const recoveredMembers = new Map<CollectionPage, Set<string>>();

  for (const collection of pages.filter(isEmptyUseCollection)) {
    recoveredMembers.set(collection, new Set());
    const keys = new Set([matchKey(collection.identity.pageId), matchKey(collection.identity.title)]);
    for (const key of keys) {
      if (!key) continue;
      const matches = collectionsByKey.get(key) || [];
      matches.push(collection);
      collectionsByKey.set(key, matches);
    }
  }

  for (const plant of pages.filter(isPlant)) {
    const plantKeys = new Set<string>();
    for (const use of plant.uses) {
      const values = [
        use.plantPart,
        use.use,
        ...(use.links || []).filter(link => link.linkType === 'internal').map(link => link.targetPageId)
      ];
      for (const value of values) {
        const key = matchKey(value);
        if (key) plantKeys.add(key);
      }
    }
    for (const key of plantKeys) {
      for (const collection of collectionsByKey.get(key) || []) {
        recoveredMembers.get(collection)?.add(plant.identity.pageId);
      }
    }
  }

  let collectionsRecovered = 0;
  let membershipsRecovered = 0;
  for (const [collection, members] of recoveredMembers) {
    if (!members.size) continue;
    collection.collection.members = [...members].sort((a, b) => a.localeCompare(b));
    collection.collection.completeness = 'populated';
    collection.collection.memberSource = 'plant_uses_inverse';
    collectionsRecovered += 1;
    membershipsRecovered += members.size;
  }
  return { collectionsRecovered, membershipsRecovered };
}
