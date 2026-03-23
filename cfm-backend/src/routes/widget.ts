import { Router } from "express";

const router = Router();

type Theme = "light" | "dark" | "red";
type ArrowStyle = "chevron" | "arrow" | "caret";

const DEFAULT_THEME: Theme = "light";
const DEFAULT_ARROW: ArrowStyle = "chevron";

const HUB_URL = process.env.WEBRING_HUB_URL ?? "https://example.com";

router.get("/", (req, res) => {
  const currentUrl = (req.query.url as string | undefined) ?? "";
  const theme = (req.query.theme as Theme | undefined) ?? DEFAULT_THEME;
  const arrow = (req.query.arrow as ArrowStyle | undefined) ?? DEFAULT_ARROW;

  const baseUrl =
    process.env.WEBRING_BASE_URL ??
    `${req.protocol}://${req.get("host") ?? ""}`.replace(/\/+$/, "");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      .cfm-webring-widget {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .cfm-webring-button {
        padding: 6px 10px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        font-size: 12px;
      }
      .cfm-webring-theme-light {
        background-color: #ffffff;
        color: #111827;
        border: 1px solid #e5e7eb;
      }
      .cfm-webring-theme-dark {
        background-color: #111827;
        color: #f9fafb;
        border: 1px solid #374151;
      }
      .cfm-webring-theme-red {
        background-color: #b91c1c;
        color: #fef2f2;
        border: 1px solid #7f1d1d;
      }
    </style>
  </head>
  <body>
    <div class="cfm-webring-widget">
      <button type="button" class="cfm-webring-button cfm-webring-theme-${theme}" id="cfm-webring-prev-btn">
        ${arrow === "caret" ? "&lsaquo;" : arrow === "arrow" ? "&larr;" : "&lsaquo;"}
      </button>
      <button type="button" class="cfm-webring-button cfm-webring-theme-${theme}" id="cfm-webring-hub-btn">
        CFM Webring
      </button>
      <button type="button" class="cfm-webring-button cfm-webring-theme-${theme}" id="cfm-webring-next-btn">
        ${arrow === "caret" ? "&rsaquo;" : arrow === "arrow" ? "&rarr;" : "&rsaquo;"}
      </button>
    </div>
    <script>
      (function() {
        var currentUrl = ${JSON.stringify(currentUrl || "")} || window.location.href;
        var baseUrl = ${JSON.stringify(baseUrl)};
        var hubUrl = ${JSON.stringify(HUB_URL)};

        function navigate(direction) {
          var endpoint = baseUrl + "/api/navigate?url=" + encodeURIComponent(currentUrl) + "&direction=" + direction;
          fetch(endpoint)
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data && data.member && data.member.url) {
                window.location.href = data.member.url;
              }
            })
            .catch(function() {
              // swallow errors for now
            });
        }

        var prevBtn = document.getElementById("cfm-webring-prev-btn");
        var nextBtn = document.getElementById("cfm-webring-next-btn");
        var hubBtn = document.getElementById("cfm-webring-hub-btn");

        if (prevBtn) {
          prevBtn.addEventListener("click", function() { navigate("prev"); });
        }
        if (nextBtn) {
          nextBtn.addEventListener("click", function() { navigate("next"); });
        }
        if (hubBtn) {
          hubBtn.addEventListener("click", function() { window.location.href = hubUrl; });
        }
      })();
    </script>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
});

export default router;

