import { mkdir, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import type { ImageInfo, PPPage, PlantPage } from '../model/types.js';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const BATCH_SIZE = 50;
const DOWNLOAD_CONCURRENCY = 4;

type FetchLike = typeof fetch;

interface CommonsImageInfo {
  url: string;
  descriptionurl: string;
}

interface CommonsPage {
  title: string;
  missing?: boolean;
  imageinfo?: CommonsImageInfo[];
}

interface CommonsResponse {
  query?: { pages?: Record<string, CommonsPage> };
}

export interface ImageDownloadStats {
  requested: number;
  resolved: number;
  downloaded: number;
  notFound: number;
  failed: number;
}

function canonicalFilename(filename: string): string {
  return filename.replace(/_/g, ' ').normalize().toLocaleLowerCase('en');
}

function stableCommonsUrl(value: string): string {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
  return url.toString();
}

function safeFilename(filename: string): string {
  const safe = filename.replace(/[\\/\0]/g, '_');
  return safe === '.' || safe === '..' ? `_${safe}` : safe;
}

function plantImages(pages: PPPage[]): Array<{ page: PlantPage; image: ImageInfo }> {
  return pages
    .filter((page): page is PlantPage => page.identity.pageType === 'plant')
    .flatMap(page => page.plant.image ? [{ page, image: page.plant.image }] : []);
}

async function resolveCommonsBatch(filenames: string[], fetchImpl: FetchLike): Promise<Map<string, CommonsImageInfo>> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url',
    redirects: '1',
    titles: filenames.map(filename => `File:${filename}`).join('|')
  });
  const response = await fetchImpl(`${COMMONS_API}?${params}`, {
    headers: { 'user-agent': 'PracticalPlantsDataParser/0.9 (offline archive recovery)' }
  });
  if (!response.ok) throw new Error(`Wikimedia Commons lookup failed with HTTP ${response.status}`);

  const body = await response.json() as CommonsResponse;
  const resolved = new Map<string, CommonsImageInfo>();
  for (const page of Object.values(body.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (page.missing || !info) continue;
    resolved.set(canonicalFilename(page.title.replace(/^File:/i, '')), info);
  }
  return resolved;
}

async function runWithConcurrency<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const worker = async () => {
    while (index < items.length) {
      const item = items[index++];
      await task(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

export async function downloadPrimaryImages(pages: PPPage[], outDir: string, fetchImpl: FetchLike = fetch): Promise<ImageDownloadStats> {
  const records = plantImages(pages);
  const byFilename = new Map<string, typeof records>();
  for (const record of records) {
    const key = canonicalFilename(record.image.filename);
    byFilename.set(key, [...(byFilename.get(key) ?? []), record]);
  }

  const keys = [...byFilename.keys()].sort();
  const resolved = new Map<string, CommonsImageInfo>();
  const lookupFailures = new Set<string>();
  for (let start = 0; start < keys.length; start += BATCH_SIZE) {
    const batchKeys = keys.slice(start, start + BATCH_SIZE);
    const filenames = batchKeys.map(key => byFilename.get(key)![0].image.filename);
    try {
      for (const [key, info] of await resolveCommonsBatch(filenames, fetchImpl)) resolved.set(key, info);
    } catch {
      for (const key of batchKeys) lookupFailures.add(key);
    }
  }

  for (const key of keys) {
    const info = resolved.get(key);
    for (const { image } of byFilename.get(key)!) {
      if (info) {
        image.externalRepository = 'Wikimedia Commons';
        image.downloadUrl = stableCommonsUrl(info.url);
        image.descriptionUrl = stableCommonsUrl(info.descriptionurl);
      } else {
        image.downloadStatus = lookupFailures.has(key) ? 'failed' : 'not_found';
      }
    }
  }

  const resolvedEntries = [...resolved.entries()];
  let downloaded = 0;
  let failed = lookupFailures.size;
  if (resolvedEntries.length) await mkdir(join(outDir, 'images'), { recursive: true });
  await runWithConcurrency(resolvedEntries, DOWNLOAD_CONCURRENCY, async ([key, info]) => {
    const matching = byFilename.get(key)!;
    const relativePath = posix.join('images', safeFilename(matching[0].image.filename));
    try {
      const response = await fetchImpl(stableCommonsUrl(info.url), {
        headers: { 'user-agent': 'PracticalPlantsDataParser/0.9 (offline archive recovery)' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.toLowerCase().startsWith('image/')) throw new Error(`Unexpected content type ${contentType}`);
      await writeFile(join(outDir, relativePath), new Uint8Array(await response.arrayBuffer()));
      downloaded++;
      for (const { image } of matching) {
        image.localPath = relativePath;
        image.downloadStatus = 'downloaded';
      }
    } catch {
      failed++;
      for (const { image } of matching) image.downloadStatus = 'failed';
    }
  });

  return {
    requested: keys.length,
    resolved: resolved.size,
    downloaded,
    notFound: keys.length - resolved.size - lookupFailures.size,
    failed
  };
}
