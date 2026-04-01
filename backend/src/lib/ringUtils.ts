import type { Member } from "../../types/index.js";

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").trim();
}

export function getMemberByUrl(members: Member[], url: string): Member | undefined {
  const target = normalizeUrl(url);
  return members.find((m) => m.url && normalizeUrl(m.url) === target);
}

function getSlice(members: Member[], cohort?: string): Member[] {
  if (!cohort) return members;
  return members.filter((m) => m.cohort === cohort);
}

function findByUrl(members: Member[], normalizedUrl: string): number {
  return members.findIndex((m) => m.url && normalizeUrl(m.url) === normalizedUrl);
}

export function getNext(members: Member[], currentUrl: string, cohort?: string): Member | null {
  const slice = getSlice(members, cohort);
  if (slice.length === 0) return null;

  const index = findByUrl(slice, normalizeUrl(currentUrl));
  if (index === -1) return null;

  return slice[(index + 1) % slice.length] ?? null;
}

export function getPrev(members: Member[], currentUrl: string, cohort?: string): Member | null {
  const slice = getSlice(members, cohort);
  if (slice.length === 0) return null;

  const index = findByUrl(slice, normalizeUrl(currentUrl));
  if (index === -1) return null;

  return slice[(index - 1 + slice.length) % slice.length] ?? null;
}
