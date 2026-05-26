export type RingMember = { url: string; cohort?: string };

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').trim();
}

function hasNavigableUrl(member: RingMember): boolean {
  return Boolean(member.url && member.url !== '#');
}

function getSlice(members: RingMember[], cohort?: string): RingMember[] {
  const navigableMembers = members.filter(hasNavigableUrl);
  if (!cohort) return navigableMembers;
  return navigableMembers.filter((m) => m.cohort === cohort);
}

function findByUrl(members: RingMember[], normalizedUrl: string): number {
  return members.findIndex((m) => m.url && normalizeUrl(m.url) === normalizedUrl);
}

export function getNext(
  members: RingMember[],
  currentUrl: string,
  cohort?: string,
): RingMember | null {
  const slice = getSlice(members, cohort);
  if (slice.length === 0) return null;

  const index = findByUrl(slice, normalizeUrl(currentUrl));
  if (index === -1) return null;

  return slice[(index + 1) % slice.length] ?? null;
}

export function getPrev(
  members: RingMember[],
  currentUrl: string,
  cohort?: string,
): RingMember | null {
  const slice = getSlice(members, cohort);
  if (slice.length === 0) return null;

  const index = findByUrl(slice, normalizeUrl(currentUrl));
  if (index === -1) return null;

  return slice[(index - 1 + slice.length) % slice.length] ?? null;
}

/** Server-side prev/next link — no hub flash (unlike hash URLs). */
export function buildRingNavHref(
  ringBase: string,
  memberUrl: string,
  direction: 'prev' | 'next',
): string {
  const base = ringBase.replace(/\/+$/, '');
  const params = new URLSearchParams({
    url: memberUrl,
    direction,
    redirect: 'true',
  });
  return `${base}/api/navigate?${params}`;
}

// --- Legacy hash-based links (client-only; may flash the hub) ---

export function normalizeMemberUrl(raw: string): string | null {
  try {
    const prefixed = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(prefixed);
    const path = u.pathname.replace(/\/+$/, '');
    return `${u.origin}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

export function parseRingNavHash(hash: string): { fromRaw: string; nav: 'prev' | 'next' } | null {
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!stripped) return null;

  const qIdx = stripped.indexOf('?');
  const fromRaw = qIdx >= 0 ? stripped.slice(0, qIdx) : stripped;
  const query = qIdx >= 0 ? stripped.slice(qIdx + 1) : '';
  const params = new URLSearchParams(query);
  const nav = (params.get('nav') || params.get('direction') || '').toLowerCase();
  if (nav !== 'prev' && nav !== 'next') return null;

  return { fromRaw, nav };
}

export function resolveRingNavTarget(
  members: RingMember[],
  fromRaw: string,
  nav: 'prev' | 'next',
): string | null {
  const fromNormalized = normalizeMemberUrl(decodeURIComponent(fromRaw || ''));
  if (!fromNormalized || members.length === 0) return null;

  const navigableMembers = members
    .filter((m) => m.url && m.url !== '#')
    .map((m) => ({
      url: m.url,
      norm: normalizeMemberUrl(m.url),
    }))
    .filter((m): m is { url: string; norm: string } => Boolean(m.norm));

  const currentIndex = navigableMembers.findIndex((m) => m.norm === fromNormalized);
  if (currentIndex < 0 || navigableMembers.length === 0) return null;

  const offset = nav === 'prev' ? -1 : 1;
  const targetIndex =
    (currentIndex + offset + navigableMembers.length) % navigableMembers.length;
  return navigableMembers[targetIndex]?.url ?? null;
}

export function getRingNavTargetFromLocationHash(
  members: RingMember[],
  hash: string,
): string | null {
  const parsed = parseRingNavHash(hash);
  if (!parsed) return null;
  return resolveRingNavTarget(members, parsed.fromRaw, parsed.nav);
}

/** Legacy hash links: redirect ASAP in <head> before paint. */
export function buildRingNavBootScript(members: RingMember[]): string {
  const navigable = members
    .filter((m) => m.url && m.url !== '#')
    .map((m) => ({
      url: m.url,
      norm: normalizeMemberUrl(m.url),
    }))
    .filter((m): m is { url: string; norm: string } => Boolean(m.norm));

  return `(function(){try{
var hash=(location.hash||'').slice(1);
if(!hash)return;
var qIdx=hash.indexOf('?');
var fromRaw=decodeURIComponent(qIdx>=0?hash.slice(0,qIdx):hash);
var query=qIdx>=0?hash.slice(qIdx+1):'';
var params=new URLSearchParams(query);
var nav=(params.get('nav')||params.get('direction')||'').toLowerCase();
if(nav!=='prev'&&nav!=='next')return;
function normalize(raw){try{
var prefixed=/^https?:\\/\\//i.test(raw)?raw:'https://'+raw;
var u=new URL(prefixed);
var path=u.pathname.replace(/\\/+$/,'');
return(u.origin+path).toLowerCase();
}catch(e){return null;}}
var fromNorm=normalize(fromRaw);
if(!fromNorm)return;
var navigable=${JSON.stringify(navigable)};
var idx=navigable.findIndex(function(m){return m.norm===fromNorm;});
if(idx<0)return;
var offset=nav==='prev'?-1:1;
var target=navigable[(idx+offset+navigable.length)%navigable.length];
if(target&&target.url)location.replace(target.url);
}catch(e){}})();`;
}
