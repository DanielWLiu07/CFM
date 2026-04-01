import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";

const router = Router();

router.get("/", (req, res) => {
  const members = loadMembers();
  const cohortParam = req.query.cohort as string | undefined;

  if (!cohortParam) {
    return res.json(members);
  }

  const filtered = members.filter((m) => m.cohort === cohortParam);
  return res.json(filtered);
});

export default router;
