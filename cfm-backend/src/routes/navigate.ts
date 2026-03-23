import { Router } from "express";
import { loadMembers } from "../lib/dataLoader.js";
import { buildFlatList, getNext, getPrev } from "../lib/ringUtils.js";

const router = Router();

router.get("/", (req, res) => {
  const url = req.query.url as string | undefined;
  const direction = req.query.direction as "next" | "prev" | undefined;
  const yearParam = req.query.year as string | undefined;

  if (!url || !direction) {
    return res.status(400).json({ error: "Missing url or direction parameter" });
  }

  if (direction !== "next" && direction !== "prev") {
    return res.status(400).json({ error: "direction must be 'next' or 'prev'" });
  }

  const data = loadMembers();
  const flat = buildFlatList(data);

  const year = yearParam ? Number(yearParam) : undefined;
  if (yearParam && !Number.isInteger(year)) {
    return res.status(400).json({ error: "Invalid year parameter" });
  }

  const member =
    direction === "next" ? getNext(flat, url, year) : getPrev(flat, url, year);

  if (!member) {
    return res.status(404).json({ error: "Member not found in ring" });
  }

  return res.json({ member });
});

export default router;

