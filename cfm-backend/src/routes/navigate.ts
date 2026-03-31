import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";
import { getNext, getPrev } from "../lib/ringUtils.js";

const router = Router();

router.get("/", (req, res) => {
  const url = req.query.url as string | undefined;
  const direction = req.query.direction as "next" | "prev" | undefined;
  const cohort = req.query.cohort as string | undefined;

  if (!url || !direction) {
    return res.status(400).json({ error: "Missing url or direction parameter" });
  }

  if (direction !== "next" && direction !== "prev") {
    return res.status(400).json({ error: "direction must be 'next' or 'prev'" });
  }

  const members = loadMembers();
  const member =
    direction === "next" ? getNext(members, url, cohort) : getPrev(members, url, cohort);

  if (!member) {
    return res.status(404).json({ error: "Member not found in ring" });
  }

  return res.json({ member });
});

export default router;
