
<p align="center">
  <img src="public/images/class_text.webp" alt="CFM Webring" width="500" />
</p>

<h3 align="center">
  The official webring for UWaterloo Computing & Financial Management.
  <br/>
  A 3D, retro-arcade showcase connecting CFM students across cohorts.
</h3>

<p align="center">
  <a href="#-join-the-ring">Join the Ring</a> &nbsp;&bull;&nbsp;
  <a href="#-add-the-widget-to-your-site">Add the Widget</a> &nbsp;&bull;&nbsp;
  <a href="#-local-development">Dev Setup</a>
</p>

---

## What is this?

A webring linking the personal sites of CFM students at the University of Waterloo. The site features:

- **3D Webring** -- an interactive graph connecting every member in 3D space
- **Class Cards** -- CRT-styled profile cards with hover effects and card expansion
- **GitHub Activity** -- live contribution feed from the community
- Built with **Next.js 16**, **Three.js**, **GSAP**, and **Tailwind CSS 4**

---

## Join the Ring

Want to add yourself? Open a PR. Here's exactly how.

### 1. Fork & clone

```bash
git clone https://github.com/<your-username>/CFM.git
cd CFM/cfm-webring
npm install
```

### 2. Add your avatar

Drop your image into `public/images/avatars/`:

| Format | File | Notes |
|--------|------|-------|
| **Photo** (preferred) | `public/images/avatars/yourname.png` | Square, at least 200x200px. Crop to your face. |
| **Fallback** | `public/images/avatars/yourname.svg` | A monogram SVG will be auto-generated if you don't provide one. |

> **Tip:** Keep file size under 200KB. Compress with [Squoosh](https://squoosh.app) or [TinyPNG](https://tinypng.com) if needed.

### 3. (Optional) Add a website screenshot

If you want your site previewed in the webring section, add a screenshot:

```
public/images/websites/yourname.png
```

- Landscape orientation, ~1200x630px works best
- This shows up when your node is selected in the 3D webring

### 4. Add yourself to `data/members.json`

Add a new entry to the array:

```jsonc
{
  "name": "Your Name",
  "url": "https://yoursite.com",           // your personal site (use "#" if you don't have one yet)
  "description": "short tagline",           // 2-3 words, shown on hover
  "role": "Your Role",                      // e.g. "Software Engineer", "PM Intern", "Student"
  "location": "City, Province",
  "school": "Your High School",             // pre-uni school
  "blurb": "A one-liner about yourself.",   // ~15 words max, shown on your card
  "year": "26",                             // your CFM entry year (e.g. "25", "26")
  "cohort": "2029",                         // expected graduation year
  "avatar": "/images/avatars/yourname.png", // path to your avatar
  "websiteImage": "/images/websites/yourname.png", // optional
  "hobbies": ["hobby1", "hobby2", "hobby3"],
  "experiences": ["Role @ Company", "Role @ Company"],
  "socials": [                              // optional, include any/all
    { "type": "github", "url": "https://github.com/you" },
    { "type": "linkedin", "url": "https://linkedin.com/in/you" },
    { "type": "twitter", "url": "https://x.com/you" },
    { "type": "website", "url": "https://yoursite.com" }
  ]
}
```

**Required fields:** `name`, `url`, `description`, `role`, `location`, `school`, `blurb`, `year`, `cohort`, `avatar`

**Optional fields:** `websiteImage`, `hobbies`, `experiences`, `socials`

### 5. Test locally

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) and make sure:
- [ ] Your card shows up in the **Class** section
- [ ] Your node appears in the **Webring** 3D view
- [ ] Your avatar loads correctly
- [ ] Clicking your card expands it with the right info

### 6. Open a PR

```bash
git checkout -b add/yourname
git add data/members.json public/images/avatars/yourname.png
git commit -m "feat: add yourname to webring"
git push origin add/yourname
```

Then open a PR against `main`. Title it something like:

> **Add [Your Name] to CFM Webring**

We'll review and merge it in.

---

## Add the Widget to Your Site

Part of being in a webring means linking back to it. Add this snippet to your personal site (footer, sidebar, wherever):

### HTML / Static Sites

```html
<div style="text-align: center; padding: 1rem; font-family: monospace;">
  <p style="margin: 0 0 0.5rem; font-size: 0.85rem; color: #888;">
    CFM Webring
  </p>
  <div style="display: flex; align-items: center; justify-content: center; gap: 1rem;">
    <a href="https://cfmwebring.com/prev?from=yourname"
       style="text-decoration: none; color: #0f0; font-size: 1.2rem;"
       title="Previous member">&larr; prev</a>
    <a href="https://cfmwebring.com"
       style="text-decoration: none; padding: 0.4rem 1rem; border: 1px solid #333;
              border-radius: 4px; color: #fff; background: #111; font-size: 0.85rem;">
      CFM Ring
    </a>
    <a href="https://cfmwebring.com/next?from=yourname"
       style="text-decoration: none; color: #0f0; font-size: 1.2rem;"
       title="Next member">next &rarr;</a>
  </div>
</div>
```

### React / JSX

```jsx
function CFMWebring() {
  const name = "yourname"; // your name as it appears in members.json (lowercase, no spaces)

  return (
    <div className="cfm-webring" style={{ textAlign: "center", padding: "1rem", fontFamily: "monospace" }}>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#888" }}>
        CFM Webring
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <a href={`https://cfmwebring.com/prev?from=${name}`} title="Previous member">
          &larr; prev
        </a>
        <a href="https://cfmwebring.com">CFM Ring</a>
        <a href={`https://cfmwebring.com/next?from=${name}`} title="Next member">
          next &rarr;
        </a>
      </div>
    </div>
  );
}
```

### Minimal (Just a link)

If you want to keep it simple:

```html
<a href="https://cfmwebring.com">CFM Webring &#x1F517;</a>
```

> **Replace `yourname`** with your first name, lowercase (the same slug used in your avatar filename). This powers the prev/next navigation around the ring.

---

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd cfm-webring
npm install
npm run dev
```

### Project Structure

```
cfm-webring/
├── app/
│   ├── page.tsx                 # Main page (assembles all sections)
│   ├── globals.css              # Global styles + animations
│   └── components/
│       ├── WebringSection.tsx    # 3D interactive webring graph
│       ├── ClassSection.tsx      # Class gallery with filters
│       ├── ClassCards3D.tsx      # CRT-styled 3D profile cards
│       ├── GithubSection.tsx     # GitHub activity feed
│       ├── AboutSection.tsx      # About / intro section
│       └── ...                  # Backgrounds, overlays, nav, etc.
├── data/
│   └── members.json             # All member data lives here
├── public/
│   ├── images/
│   │   ├── avatars/             # Member avatars (png or svg)
│   │   └── websites/            # Member website screenshots
│   ├── fonts/                   # ArcadeClassic + Geist
│   ├── videos/
│   └── music/
└── package.json
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 |
| UI | React 19, Tailwind CSS 4 |
| 3D | Three.js, React Three Fiber, Drei |
| Animation | GSAP |
| Fonts | ArcadeClassic, Geist |

---

## PR Checklist

Before submitting, make sure:

- [ ] Added your entry to `data/members.json`
- [ ] Avatar image is in `public/images/avatars/` (square, under 200KB)
- [ ] All required fields are filled in
- [ ] `npm run build` passes with no errors
- [ ] Tested locally -- card renders, webring node appears
- [ ] (Bonus) Added the webring widget to your personal site

---

<p align="center">
  <strong>Built with unhealthy amounts of Three.js by CFM students at UWaterloo.</strong>
</p>
