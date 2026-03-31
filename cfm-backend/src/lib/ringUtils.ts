import type { Member, MembersData } from "../../types/index.js";

export function buildFlatList(data: MembersData): Member[] {
  const years = Object.keys(data)
    .map(Number)
    .filter((year) => Number.isInteger(year))
    .sort((a, b) => a - b);

  const flat: Member[] = [];

  for (const year of years) {
    const membersForYear = data[year];
    if (!membersForYear) continue;
    flat.push(...membersForYear);
  }

  return flat;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").trim();
}

export function getMemberByUrl(flatList: Member[], url: string): Member | undefined {
  const target = normalizeUrl(url);
  return flatList.find((m) => m.url && normalizeUrl(m.url) === target);
}

/** Build a lookup map for O(1) member access by normalized URL. */
export function buildUrlIndex(flatList: Member[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < flatList.length; i++) {
    const m = flatList[i];
    if (m.url) map.set(normalizeUrl(m.url), i);
  }
  return map;
}

function getCohortSlice(flatList: Member[], year?: number): Member[] {
  if (typeof year !== "number") {
    return flatList;
  }
  return flatList.filter((m) => m.graduationYear === year);
}

export function getNext(
  flatList: Member[],
  currentUrl: string,
  year?: number,
): Member | null {
  const slice = getCohortSlice(flatList, year);
  if (slice.length === 0) return null;

  const target = normalizeUrl(currentUrl);
  const index = findByUrl(slice, target);
  if (index === -1) return null;

  return slice[(index + 1) % slice.length] ?? null;
}

export function getPrev(
  flatList: Member[],
  currentUrl: string,
  year?: number,
): Member | null {
  const slice = getCohortSlice(flatList, year);
  if (slice.length === 0) return null;

  const target = normalizeUrl(currentUrl);
  const index = findByUrl(slice, target);
  if (index === -1) return null;

  return slice[(index - 1 + slice.length) % slice.length] ?? null;
}

function findByUrl(members: Member[], normalizedUrl: string): number {
  return members.findIndex((m) => m.url && normalizeUrl(m.url) === normalizedUrl);
}

