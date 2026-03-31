// #region agent log
import express from "express";
import cors from "cors";
import membersRouter from "./routes/members.js";
import navigateRouter from "./routes/navigate.js";
import widgetRouter from "./routes/widget.js";
import webringRouter from "./routes/webring.js";
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/members", membersRouter);
app.use("/api/navigate", navigateRouter);
app.use("/api/widget", widgetRouter);
app.use("/api/webring", webringRouter);

// Global error handler — prevents unhandled errors from crashing the server
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(port, () => {
  console.log(`CFM Webring backend listening on port ${port}`);
});

