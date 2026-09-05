import type { CollectionPage, PPPage } from '../model/types.js';

export interface CategoryCollectionRecoveryStats {
  collectionsRecovered: number;
  membershipsRecovered: number;
  completeCollections: number;
}

export function recoverCategoryCollections(pages: PPPage[]): CategoryCollectionRecoveryStats {
  const collections = new Map<string, CollectionPage>();
  for (const page of pages) {
    if (page.identity.pageType !== 'collection') continue;
    const collectionPage = page as CollectionPage;
    if (collectionPage.collection.kind === 'category') collections.set(page.identity.pageId, collectionPage);
  }

  const inverseMembers = new Map<string, Set<string>>();
  for (const page of pages) {
    for (const membership of page.categories) {
      if (!collections.has(membership.categoryPageId)) continue;
      const members = inverseMembers.get(membership.categoryPageId) ?? new Set<string>();
      members.add(page.identity.pageId);
      inverseMembers.set(membership.categoryPageId, members);
    }
  }

  let collectionsRecovered = 0;
  let membershipsRecovered = 0;
  let completeCollections = 0;
  for (const [categoryPageId, collectionPage] of collections) {
    const inverse = inverseMembers.get(categoryPageId);
    if (inverse?.size) {
      const archivedMembers = new Set(collectionPage.collection.members);
      const members = [...new Set([...archivedMembers, ...inverse])].sort();
      membershipsRecovered += members.filter(member => !archivedMembers.has(member)).length;
      collectionPage.collection.members = members;
      collectionPage.collection.completeness = 'populated';
      collectionPage.collection.memberSource = 'category_membership_inverse';
      collectionsRecovered++;
    }
    collectionPage.collection.membersComplete = collectionPage.collection.totalMembers === undefined || collectionPage.collection.members.length >= collectionPage.collection.totalMembers;
    if (collectionPage.collection.membersComplete) completeCollections++;
  }

  return { collectionsRecovered, membershipsRecovered, completeCollections };
}
