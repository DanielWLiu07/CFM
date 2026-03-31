import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";

const router = Router();

router.get("/", (req, res) => {
  const members = loadMembers();
  const year = req.query.year as string | undefined;

  let filtered = members.filter((m) => m.url && m.url !== "#");
  if (year) filtered = filtered.filter((m) => m.year === year);

  return res.json(filtered);
});

export default router;
