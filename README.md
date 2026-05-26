# CFM Webring

### The official webring for UWaterloo Computing & Financial Management.

A 3D, retro-arcade showcase connecting current/incoming/interested CFM students across cohorts.

## Quick Start (Fork & Clone)

```bash
git clone https://github.com/your-username/CFM.git
cd CFM
```

## Joining the webring + class profile

1. Add your avatar to `frontend/public/images/avatars/` (`png`, `jpeg`, `webp`, or `svg`).
2. (Optional) Add a site screenshot to `frontend/public/images/websites/yourname.png`.
3. Add your member entry in `backend/data/members.json`:

```json
{
  "name": "Your Name",
  "cohort": "graduating-year", // 2030
  "url": "your-website", // MUST be valid or '#'
  "location": "City, Province, Country",
  "role": "Most Recent/Relevent Role",
  "header": "Short header",
  "description": "One-line description",
  "experiences": ["Role @ Company", "Field/Sector"],
  "interests": ["Interest1","Interest2","Interest3"],
  "avatar": "/images/avatars/your-image", // MUST match avatar path
  "websiteImage": "/images/websites/your-website-image", // OPTIONAL, MUST match website image path
  "socials": [
    { "type": "github", "url": "#" }, // pick and choose display socials 
    { "type": "linkedin", "url": "#" }, // replace '#' with your links 
    { "type": "twitter", "url": "#" },
    { "type": "instagram", "url": "#" }
  ]
}
```

### Important Notes

- `url` can be `#` if there is no website
- Ensure **all links are valid and working**
- Make sure your avatar and website image paths are correct

Open a PR with your `members.json` + your image added!

---

## Embedding the Webring on Your Personal Site

Once you're in the class profile & webring (with a valid url), you can add webring navigation on your personal website!

### Important Notes

- Replace `YOUR_WEBSITE_URL` with your site's URL (must **exactly match** your `url` field in members.json)
- Your URL must be in members.json with a valid website (not `#`)

### Prev / next navigation (`/api/navigate`)

Use the **navigate API** for prev/next links. The server responds with a `302` redirect straight to the next member site — no hub flash.

**Endpoint:**

```
GET {ringBase}/api/navigate?url={YOUR_WEBSITE_URL}&direction={prev|next}&redirect=true
```

| Query param   | Value                                      |
|---------------|--------------------------------------------|
| `url`         | Your site URL (must match `members.json`)  |
| `direction`   | `prev` or `next`                           |
| `redirect`    | `true` (required for instant redirect)     |

**Examples (production):**

- Previous: `https://www.uwaterloocfm.com/api/navigate?url=https%3A%2F%2Faadyakhanna.com&direction=prev&redirect=true`
- Next: `https://www.uwaterloocfm.com/api/navigate?url=https%3A%2F%2Faadyakhanna.com&direction=next&redirect=true`

**Local testing** (with `npm run dev` in `frontend/`):

- Previous: `http://localhost:3000/api/navigate?url=https%3A%2F%2Faadyakhanna.com&direction=prev&redirect=true`
- Next: `http://localhost:3000/api/navigate?url=https%3A%2F%2Faadyakhanna.com&direction=next&redirect=true`

Set `ringBase` to `http://localhost:3000` while developing; use `https://www.uwaterloocfm.com` in production.

Do **not** use hash links (`/#your-site?nav=prev`) — the hash is never sent to the server, so the full hub page loads before redirecting.

### Hub Icon

Default hub-icon assets:

- `https://www.uwaterloocfm.com/webring/cfm-panther-black.svg`
- `https://www.uwaterloocfm.com/webring/cfm-panther-white.svg`
- `https://www.uwaterloocfm.com/webring/cfm-panther-green.svg`


HTML setup (minimal setup + arrows):

```html
<div style="display: flex; gap: 12px; align-items: center; font-size: 24px;">
  <!-- Left Nav -->
  <a href="https://www.uwaterloocfm.com/api/navigate?url=YOUR_WEBSITE_URL&direction=prev&redirect=true"
     style="text-decoration: none; color: inherit; cursor: pointer;">
    ←
  </a>

  <!-- Hub icon -->
  <a href="https://uwaterloocfm.com" target="_blank">
    <img src="https://www.uwaterloocfm.com/webring/cfm-panther-black.svg" alt="CFM Webring Hub" style="width: 40px;">
  </a>

  <!-- Right Nav -->
  <a href="https://www.uwaterloocfm.com/api/navigate?url=YOUR_WEBSITE_URL&direction=next&redirect=true"
     style="text-decoration: none; color: inherit; cursor: pointer;">
    →
  </a>
</div>
```

Replace `YOUR_WEBSITE_URL` with your URL, URL-encoded (e.g. `https%3A%2F%2Fyoursite.com`).

For customisation of the hub-icon (custom colours, dark-light mode, animations), starter template is available at `https://www.uwaterloocfm.com/webring/custom.tsx`

You are also able to use your own images/SVGs for arrows to match your sites design:

```html
<!-- Left Nav -->
<a href="https://www.uwaterloocfm.com/api/navigate?url=YOUR_WEBSITE_URL&direction=prev&redirect=true">
    <img src="/your-custom-left-arrow.svg" alt="Previous in CFM Webring" style="width: 50px; cursor: pointer;">
</a>
```

### Component for React/Next.js Sites

```jsx
export default function WebringWidget() {
  const myUrl = "https://yoursite.com"; // Must match your members.json URL
  const ringBase = "https://www.uwaterloocfm.com"; // local dev: "http://localhost:3000"

  const navHref = (direction: "prev" | "next") => {
    const params = new URLSearchParams({
      url: myUrl,
      direction,
      redirect: "true",
    });
    return `${ringBase}/api/navigate?${params}`;
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <a href={navHref("prev")} aria-label="Previous site in CFM webring">
        ←
      </a>

      <a href={ringBase} target="_blank" rel="noopener noreferrer" aria-label="CFM Webring Hub">
        <img
          src={`${ringBase}/webring/cfm-panther-black.svg`}
          alt="CFM Webring Hub"
          style={{ width: 40, display: "block" }}
        />
      </a>

      <a href={navHref("next")} aria-label="Next site in CFM webring">
        →
      </a>
    </div>
  );
}
```

Use your own arrow markup or SVGs in place of `←` / `→` if you prefer — keep `href={navHref("prev")}` and `href={navHref("next")}`.

