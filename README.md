# CFM Webring

### The official webring for UWaterloo Computing & Financial Management.

A 3D, retro-arcade showcase connecting CFM students across cohorts.

## Quick Start (Fork & Clone)

```bash
git clone https://github.com/<your-username>/CFM.git
cd CFM
```

## Joining the webring + class profile

1. Add your avatar to `frontend/public/images/avatars/` (`png`, `jpeg`, `webp`, or `svg`).
2. (Optional) Add a site screenshot to `frontend/public/images/websites/yourname.png`.
3. Add your member entry in `backend/data/members.json`:

```json
{
  "name": "Your Name",
  "cohort": "graduating-year",
  "url": "https://yourwebsite.com",
  "location": "Your City, Province",
  "role": "Most Recent/Relevent Role",
  "header": "Short header",
  "experiences": ["Role @ Company", "Field/Sector"],
  "description": "One-line description",
  "avatar": "/images/avatars/YOUR-IMAGE",
  "websiteImage": "/images/websites/yourname.png",
  "socials": [
    { "type": "github", "url": "https://github.com/yourusername" },
    { "type": "linkedin", "url": "https://linkedin.com/in/yourprofile" }
  ]
}
```

---

### Example

```json
{
  "name": "Aadya Khanna",
  "cohort": "2030",
  "url": "https://aadyakhanna.com",
  "location": "Toronto, ON",
  "role": "Product Engineer",
  "header": "Mathematically Musical",
  "experiences": ["Product Engineer"],
  "description": "Drawn to the intersection of technology, creativity, and financial markets",
  "avatar": "/images/avatars/aadyakhanna.jpeg",
  "socials": [
    { "type": "github", "url": "https://github.com/aadya-khanna" },
    { "type": "linkedin", "url": "https://linkedin.com/in/aadya-khanna" }
  ]
}
```

### Important Notes

- Ensure **all links are valid and working**
- Make sure your avatar path is correct
- Use `#` for socials you don't have (or omit them entirely)
- `url` can be `#` if your website is not ready yet
- `cohort` is your graduation year (e.g. "2029")
- `websiteImage` is optional

1. Run and verify locally:

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd ../backend
npm install
npm run dev
```

1. Open a PR with your `members.json` + image changes.

## Embedding the Webring on Your Site

Once you're in the webring (added to members.json with a valid website URL), you can add webring navigation to your personal website!

### Hub Icon

Hosted icon assets (production):

- `https://cfm-webring.vercel.app/webring/cfm-panther-black.svg`
- `https://cfm-webring.vercel.app/webring/cfm-panther-white.svg`
- `https://cfm-webring.vercel.app/webring/cfm-panther-green.svg`

Use one of these approaches:

- Quick setup (hosted image file): easiest to copy and keep docs clean.
- Starter template: download and edit `https://cfm-webring.vercel.app/webring/custom.tsx`.
- Full control (inline SVG): copy one asset and edit locally.

Quick setup:

```html
<a href="https://uwaterloocfm.com" target="_blank">
  <img src="https://cfm-webring.vercel.app/webring/cfm-panther-black.svg" alt="CFM Webring Hub" style="width: 50px;">
</a>
```

Starter template (download + edit): `https://cfm-webring.vercel.app/webring/custom.tsx`

### Add the Widget to Your Site

### Option 1: Custom Arrow Images (Maximum Creativity)

Use your own images/SVGs for the arrows to match your site's design:

```html
<div style="display: flex; gap: 8px; align-items: center;">
  <!-- Your custom left arrow -->
  <a href="https://cfm-webring.vercel.app/#YOUR_WEBSITE_URL?nav=prev">
    <img src="/your-custom-left-arrow.svg" alt="Previous in CFM Webring" style="width: 50px; cursor: pointer;">
  </a>

  <!-- Hub icon -->
  <a href="https://uwaterloocfm.com" target="_blank">
    <img src="https://cfm-webring.vercel.app/webring/cfm-panther-black.svg" alt="CFM Webring Hub" style="width: 50px; cursor: pointer;">
  </a>

  <!-- Your custom right arrow -->
  <a href="https://cfm-webring.vercel.app/#YOUR_WEBSITE_URL?nav=next">
    <img src="/your-custom-right-arrow.svg" alt="Next in CFM Webring" style="width: 50px; cursor: pointer;">
  </a>
</div>
```

### Option 2: Simple Text Arrows (Quick Setup)

For a minimal approach, use text/emoji arrows:

```html
<div style="display: flex; gap: 12px; align-items: center; font-size: 24px;">
  <a href="https://cfm-webring.vercel.app/#YOUR_WEBSITE_URL?nav=prev"
     style="text-decoration: none; color: inherit; cursor: pointer;">
    ←
  </a>

  <!-- Hub icon -->
  <a href="https://uwaterloocfm.com" target="_blank">
    <img src="https://cfm-webring.vercel.app/webring/cfm-panther-black.svg" alt="CFM Webring Hub" style="width: 40px;">
  </a>

  <a href="https://cfm-webring.vercel.app/#YOUR_WEBSITE_URL?nav=next"
     style="text-decoration: none; color: inherit; cursor: pointer;">
    →
  </a>
</div>
```

### For React/Next.js Sites

```jsx
export default function WebringWidget() {
  const myUrl = "https://yoursite.com"; // Must match your members.json URL
  const ringBase = "https://cfm-webring.vercel.app";

  const HubIcon = ({ size = 50 }) => (
    <img src="https://cfm-webring.vercel.app/webring/cfm-panther-black.svg" alt="CFM Webring Hub" style={{ width: size, cursor: 'pointer' }} />
  );

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <a href={`${ringBase}/#${encodeURIComponent(myUrl)}?nav=prev`}>
        <img src="/your-left-arrow.svg" alt="Previous" style={{ width: '50px', cursor: 'pointer' }} />
      </a>

      <a href="https://uwaterloocfm.com" target="_blank" rel="noopener noreferrer">
        <HubIcon size={50} />
      </a>

      <a href={`${ringBase}/#${encodeURIComponent(myUrl)}?nav=next`}>
        <img src="/your-right-arrow.svg" alt="Next" style={{ width: '50px', cursor: 'pointer' }} />
      </a>
    </div>
  );
}
```

### Important Notes

- Replace `YOUR_WEBSITE_URL` with your site's URL (must **exactly match** your `url` field in members.json)
- Your URL must be in members.json with a valid website (not `#`)
- Webring links now resolve through `https://cfm-webring.vercel.app/#YOUR_WEBSITE_URL?nav=prev|next`
- Ring navigation skips members with invalid URLs (for example `url: "#"`), and wraps around from last valid site to first valid site
- Arrows: Use any image/SVG you want for complete creative control
- Hub icon variants: use black/white/green files from `/webring/` on production
- Starter template: download `https://cfm-webring.vercel.app/webring/custom.tsx` and edit `myUrl` + styles

### Test It Quickly

Use your website URL in these links and verify both redirect:

```text
https://cfm-webring.vercel.app/#YOUR_WEBSITE_URL?nav=prev
https://cfm-webring.vercel.app/#YOUR_WEBSITE_URL?nav=next
```

