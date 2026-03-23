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
  return flatList.find((m) => normalizeUrl(m.url) === target);
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
  const index = slice.findIndex((m) => normalizeUrl(m.url) === target);
  if (index === -1) return null;

  const nextIndex = (index + 1) % slice.length;
  const nextMember = slice[nextIndex];
  return nextMember ?? null;
}

export function getPrev(
  flatList: Member[],
  currentUrl: string,
  year?: number,
): Member | null {
  const slice = getCohortSlice(flatList, year);
  if (slice.length === 0) return null;

  const target = normalizeUrl(currentUrl);
  const index = slice.findIndex((m) => normalizeUrl(m.url) === target);
  if (index === -1) return null;

  const prevIndex = (index - 1 + slice.length) % slice.length;
  const prevMember = slice[prevIndex];
  return prevMember ?? null;
}

