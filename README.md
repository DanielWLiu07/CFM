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

Canonical asset: `cfm-panther.svg`

Use one of these approaches:

- Quick setup (image file): easiest to copy and keep docs clean.
- Full control (inline SVG): best when you want custom color, animation, or transforms.

Quick setup:

```html
<a href="https://uwaterloocfm.com" target="_blank">
  <img src="/cfm-panther.svg" alt="CFM Webring Hub" style="width: 50px;">
</a>
```

For full-control inline customization, copy the SVG from `cfm-panther.svg` into your HTML and style with `fill="currentColor"`.

### Add the Widget to Your Site

### Option 1: Custom Arrow Images (Maximum Creativity)

Use your own images/SVGs for the arrows to match your site's design:

```html
<div style="display: flex; gap: 8px; align-items: center;">
  <!-- Your custom left arrow -->
  <a href="https://api.cfm-webring.com/api/navigate?url=YOUR_WEBSITE_URL&direction=prev&redirect=true">
    <img src="/your-custom-left-arrow.svg" alt="Previous in CFM Webring" style="width: 50px; cursor: pointer;">
  </a>

  <!-- Hub icon -->
  <a href="https://uwaterloocfm.com" target="_blank">
    <img src="/cfm-panther.svg" alt="CFM Webring Hub" style="width: 50px; cursor: pointer;">
  </a>

  <!-- Your custom right arrow -->
  <a href="https://api.cfm-webring.com/api/navigate?url=YOUR_WEBSITE_URL&direction=next&redirect=true">
    <img src="/your-custom-right-arrow.svg" alt="Next in CFM Webring" style="width: 50px; cursor: pointer;">
  </a>
</div>
```

### Option 2: Simple Text Arrows (Quick Setup)

For a minimal approach, use text/emoji arrows:

```html
<div style="display: flex; gap: 12px; align-items: center; font-size: 24px;">
  <a href="https://api.cfm-webring.com/api/navigate?url=YOUR_WEBSITE_URL&direction=prev&redirect=true"
     style="text-decoration: none; color: inherit; cursor: pointer;">
    ←
  </a>

  <!-- Hub icon -->
  <a href="https://uwaterloocfm.com" target="_blank">
    <img src="/cfm-panther.svg" alt="CFM Webring Hub" style="width: 40px;">
  </a>

  <a href="https://api.cfm-webring.com/api/navigate?url=YOUR_WEBSITE_URL&direction=next&redirect=true"
     style="text-decoration: none; color: inherit; cursor: pointer;">
    →
  </a>
</div>
```

### For React/Next.js Sites

```jsx
export default function WebringWidget() {
  const myUrl = "https://yoursite.com"; // Must match your members.json URL
  const apiBase = "https://api.cfm-webring.com/api/navigate";

  const HubIcon = ({ size = 50 }) => (
    <img src="/cfm-panther.svg" alt="CFM Webring Hub" style={{ width: size, cursor: 'pointer' }} />
  );

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <a href={`${apiBase}?url=${encodeURIComponent(myUrl)}&direction=prev&redirect=true`}>
        <img src="/your-left-arrow.svg" alt="Previous" style={{ width: '50px', cursor: 'pointer' }} />
      </a>

      <a href="https://uwaterloocfm.com" target="_blank" rel="noopener noreferrer">
        <HubIcon color="#991b1b" size={50} />
      </a>

      <a href={`${apiBase}?url=${encodeURIComponent(myUrl)}&direction=next&redirect=true`}>
        <img src="/your-right-arrow.svg" alt="Next" style={{ width: '50px', cursor: 'pointer' }} />
      </a>
    </div>
  );
}
```

### Important Notes

- Replace `YOUR_WEBSITE_URL` with your site's URL (must **exactly match** your `url` field in members.json)
- Your URL must be in members.json with a valid website (not `#`)
- Arrows: Use any image/SVG you want for complete creative control
- Hub icon: use the file-based `<img>` for fastest setup, or inline SVG if you want color/animation control

