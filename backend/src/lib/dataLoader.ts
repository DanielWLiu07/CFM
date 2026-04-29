import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Member } from "../../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedMembers: Member[] | null = null;

function validateMember(member: Member): boolean {
  return Boolean(member.name && member.cohort && member.description);
}

export function loadMembers(): Member[] {
  if (cachedMembers) {
    return cachedMembers;
  }

  const dataPath = join(__dirname, "..", "..", "data", "members.json");
  const raw = readFileSync(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown[];

  const members: Member[] = [];
  for (const entry of parsed) {
    const m = entry as Member;
    if (validateMember(m)) members.push(m);
  }

  cachedMembers = members;
  return members;
}

export function reloadMembers(): Member[] {
  cachedMembers = null;
  return loadMembers();
}
