import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";

const router = Router();

router.get("/", (req, res) => {
  const data = loadMembers();
  const yearParam = req.query.year as string | undefined;

  let membersToFilter = data;

  if (yearParam) {
    const year = Number(yearParam);
    if (!Number.isInteger(year)) {
      return res.status(400).json({ error: "Invalid year parameter" });
    }
    const membersForYear = data[year] ?? [];
    membersToFilter = { [year]: membersForYear };
  }

  const webringMembers: typeof data = {};

  for (const [yearKey, members] of Object.entries(membersToFilter)) {
    const year = Number(yearKey);
    const filtered = members.filter((m) => m.hasWebsite && m.url && m.url !== "#");

    if (filtered.length > 0) {
      webringMembers[year] = filtered;
    }
  }

  return res.json(webringMembers);
});

export default router;
