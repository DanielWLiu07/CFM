# CFM Webring


<p align="center">
  <img src="public/images/class_text.webp" alt="CFM Webring" width="500" />
</p>

<h3 align="center">
  The official webring for UWaterloo Computing & Financial Management.
  <br/>
  A 3D, retro-arcade showcase connecting CFM students across cohorts.
</h3>

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
  "year": "26",
  "url": "https://yourwebsite.com",
  "location": "Your City, Province",
  "role": "role",
  "tagline": "Short tagline / header",
  "quote": "a little quote",
  "description": "A longer description about you",
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
  "year": "30",
  "url": "https://aadyakhanna.com",
  "location": "Toronto, ON",
  "role": "Product Engineer",
  "tagline": "Mathematically Musical",
  "quote": "Drawn to the intersection of technology, creativity, and financial markets",
  "description": "Builder, Creative-Techie, Guitarist",
  "avatar": "/images/avatars/aadyakhanna.jpeg",
  "websiteImage": "#",
  "socials": [
    { "type": "github", "url": "https://github.com/aadya-khanna" },
    { "type": "linkedin", "url": "https://linkedin.com/in/aadya-khanna" }
  ]
}
```

### Important Notes

* Ensure **all links are valid and working**
* Make sure your avatar path is correct
* Use `#` for socials you don't have (or omit them entirely)
* `cohort` is your graduation year (e.g. "2029")



4. Run and verify locally:

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

5. Open a PR with your `members.json` + image changes.


## Embedding the Webring on Your Site

Once you're in the webring (added to members.json with a valid website URL), you can add webring navigation to your personal website!

### Hub Icon

The hub icon is a small inline SVG — paste it directly into your HTML. Because it uses `currentColor` throughout, a single `color` CSS value controls the entire icon:

```html
<a href="https://uwaterloocfm.com" target="_blank">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 50px; color: #991b1b;">
    <circle cx="50" cy="50" r="42" stroke="currentColor" stroke-width="3" fill="none" opacity="0.9"/>
    <text x="50" y="58" text-anchor="middle" dominant-baseline="middle"
          fill="currentColor" font-family="system-ui, -apple-system, sans-serif"
          font-weight="700" font-size="22" letter-spacing="-0.5">CFM</text>
  </svg>
</a>
```

Change `color: #991b1b` to any CSS color to match your site.

### Add the Widget to Your Site

### Option 1: Custom Arrow Images (Maximum Creativity)

Use your own images/SVGs for the arrows to match your site's design:

```html
<div style="display: flex; gap: 8px; align-items: center;">
  <!-- Your custom left arrow -->
  <a href="https://api.cfm-webring.com/api/navigate?url=YOUR_WEBSITE_URL&direction=prev&redirect=true">
    <img src="/your-custom-left-arrow.svg" alt="Previous in CFM Webring" style="width: 50px; cursor: pointer;">
  </a>

  <!-- Hub icon (inline SVG — change color to match your site) -->
  <a href="https://uwaterloocfm.com" target="_blank">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 50px; color: #991b1b; cursor: pointer;">
      <circle cx="50" cy="50" r="42" stroke="currentColor" stroke-width="3" fill="none" opacity="0.9"/>
      <text x="50" y="58" text-anchor="middle" dominant-baseline="middle"
            fill="currentColor" font-family="system-ui, -apple-system, sans-serif"
            font-weight="700" font-size="22" letter-spacing="-0.5">CFM</text>
    </svg>
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

  <!-- Hub icon (inline SVG — change color to match your site) -->
  <a href="https://uwaterloocfm.com" target="_blank">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 40px; color: #991b1b;">
      <circle cx="50" cy="50" r="42" stroke="currentColor" stroke-width="3" fill="none" opacity="0.9"/>
      <text x="50" y="58" text-anchor="middle" dominant-baseline="middle"
            fill="currentColor" font-family="system-ui, -apple-system, sans-serif"
            font-weight="700" font-size="22" letter-spacing="-0.5">CFM</text>
    </svg>
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

  const HubIcon = ({ color = "#991b1b", size = 50 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ width: size, color, cursor: 'pointer' }}>
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.9"/>
      <text x="50" y="58" textAnchor="middle" dominantBaseline="middle"
            fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="700" fontSize="22" letterSpacing="-0.5">CFM</text>
    </svg>
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
- Hub icon: Change the `color` value to match your site's theme