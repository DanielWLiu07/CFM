import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";

const router = Router();

router.get("/", (req, res) => {
  const data = loadMembers();
  const yearParam = req.query.year as string | undefined;

  if (!yearParam) {
    return res.json(data);
  }

  const year = Number(yearParam);
  if (!Number.isInteger(year)) {
    return res.status(400).json({ error: "Invalid year parameter" });
  }

  const membersForYear = data[year] ?? [];
  return res.json({ [year]: membersForYear });
});

export default router;

