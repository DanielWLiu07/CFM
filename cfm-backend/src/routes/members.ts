import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";

const router = Router();

router.get("/", (req, res) => {
  const members = loadMembers();
  const yearParam = req.query.year as string | undefined;

  if (!yearParam) {
    return res.json(members);
  }

  const filtered = members.filter((m) => m.year === yearParam);
  return res.json(filtered);
});

export default router;
