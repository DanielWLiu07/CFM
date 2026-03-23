import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Member, MembersData } from "../../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedMembers: MembersData | null = null;

function validateMember(member: Member): boolean {
  return typeof member.url === "string" && member.url.startsWith("https://");
}

export function loadMembers(): MembersData {
  if (cachedMembers) {
    return cachedMembers;
  }

  const dataPath = join(__dirname, "..", "data", "members.json");
  const raw = readFileSync(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown[]>;

  const result: MembersData = {};

  for (const [yearKey, members] of Object.entries(parsed)) {
    const year = Number(yearKey);
    if (!Number.isInteger(year)) continue;

    result[year] = [];

    for (const entry of members as any[]) {
      const member: Member = {
        name: entry.name,
        url: entry.url,
        graduationYear: entry.graduationYear ?? entry.year ?? year,
      };

      if (!validateMember(member)) {
        // Skip invalid entries for now; could also throw.
        continue;
      }

      result[year].push(member);
    }
  }

  cachedMembers = result;
  return result;
}

export function reloadMembers(): MembersData {
  cachedMembers = null;
  return loadMembers();
}

