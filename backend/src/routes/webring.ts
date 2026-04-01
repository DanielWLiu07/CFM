import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";

const router = Router();

router.get("/", (req, res) => {
  const members = loadMembers();
  const cohort = req.query.cohort as string | undefined;

  let filtered = members.filter((m) => m.url && m.url !== "#");
  if (cohort) filtered = filtered.filter((m) => m.cohort === cohort);

  return res.json(filtered);
});

export default router;
