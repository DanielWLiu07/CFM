
<p align="center">
  <img src="public/images/class_text.webp" alt="CFM Webring" width="500" />
</p>

<h3 align="center">
  The official webring for UWaterloo Computing & Financial Management.
  <br/>
  A 3D, retro-arcade showcase connecting CFM students across cohorts.
</h3>

<p align="center">
  <a href="#join-the-ring">Join the Ring</a> &nbsp;&bull;&nbsp;
  <a href="#add-the-widget-to-your-site">Add the Widget</a> &nbsp;&bull;&nbsp;
  <a href="#local-development">Dev Setup</a> &nbsp;&bull;&nbsp;
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-r183-black?logo=three.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss" />
</p>

---

## What is this?

A **webring** is a collection of websites linked together in a ring -- click "next" or "prev" to travel between member sites. This one is built specifically for **CFM (Computing & Financial Management)** students at the University of Waterloo.

The hub site features:

- **3D Webring** -- an interactive force-directed graph connecting every member in 3D space
- **Class Cards** -- CRT-styled profile cards with hover effects, card expansion, and a retro TV power-on/off animation
- **GitHub Activity** -- live contribution chart and repo stats pulled from the GitHub API
- **About Section** -- animated card stack explaining the CFM program (curriculum, co-op, career paths)
- **Beat-synced animations** -- wires, gears, and UI elements pulse to an audio track at 93 BPM
- **Pixel trail** -- WebGL mouse trail effect on the hero section
- **Reduced motion support** -- all animations can be paused with a single toggle

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
| **Photo** (preferred) | `public/images/avatars/yourname.png` | Square, at least 200x200 px. Crop to your face. |
| **Fallback** | none needed | A monogram with your initials is generated automatically. |

> **Tip:** Keep file size under 200 KB. Compress with [Squoosh](https://squoosh.app) or [TinyPNG](https://tinypng.com) if needed.

### 3. (Optional) Add a website screenshot

If you want your site previewed in the webring section, add a screenshot:

```
public/images/websites/yourname.png
```

Landscape orientation, ~1200x630 px works best. This shows up when your node is selected in the 3D webring.

### 4. Add yourself to `data/members.json`

Open the file and add a new entry to the appropriate year array:

```jsonc
{
  "name": "Your Name",
  "url": "https://yoursite.com",           // personal site (use "#" if you don't have one yet)
  "description": "short tagline",           // 2-3 words, shown on hover
  "role": "Your Role",                      // e.g. "Software Engineer", "PM Intern", "Student"
  "location": "City, Province",
  "school": "Your High School",             // pre-university school
  "blurb": "A one-liner about yourself.",   // ~15 words max, shown on your card
  "year": "26",                             // your CFM entry year (e.g. "25", "26")
  "cohort": "2029",                         // expected graduation year
  "avatar": "/images/avatars/yourname.png",
  "websiteImage": "/images/websites/yourname.png", // optional
  "hobbies": ["hobby1", "hobby2", "hobby3"],       // optional
  "experiences": [                                   // optional, string or {title, logo}
    "Role @ Company",
    { "title": "SWE Intern @ Google", "logo": "/images/logos/google.png" }
  ],
  "socials": [                                      // optional, include any/all
    { "type": "github", "url": "https://github.com/you" },
    { "type": "linkedin", "url": "https://linkedin.com/in/you" },
    { "type": "instagram", "url": "https://instagram.com/you" },
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

Open [localhost:3000](http://localhost:3000) and verify:

- [ ] Your card shows up in the **Class** section
- [ ] Your node appears in the **Webring** 3D view
- [ ] Your avatar loads correctly
- [ ] Clicking your card expands with the right info

### 6. Open a PR

```bash
git checkout -b add/yourname
git add data/members.json public/images/avatars/yourname.png
git commit -m "feat: add yourname to webring"
git push origin add/yourname
```

Then open a PR against `main`. Title it:

> **Add [Your Name] to CFM Webring**

We'll review and merge it.

---

## Add the Widget to Your Site

Part of being in a webring means linking back. Add one of these to your personal site:

### HTML / Static sites

```html
<div style="text-align:center; padding:1rem; font-family:monospace;">
  <p style="margin:0 0 .5rem; font-size:.85rem; color:#888;">CFM Webring</p>
  <div style="display:flex; align-items:center; justify-content:center; gap:1rem;">
    <a href="https://cfmwebring.com/prev?from=yourname"
       style="text-decoration:none; color:#0f0; font-size:1.2rem;"
       title="Previous member">&larr; prev</a>
    <a href="https://cfmwebring.com"
       style="text-decoration:none; padding:.4rem 1rem; border:1px solid #333;
              border-radius:4px; color:#fff; background:#111; font-size:.85rem;">
      CFM Ring
    </a>
    <a href="https://cfmwebring.com/next?from=yourname"
       style="text-decoration:none; color:#0f0; font-size:1.2rem;"
       title="Next member">next &rarr;</a>
  </div>
</div>
```

### React / JSX

```jsx
function CFMWebring() {
  const name = "yourname"; // lowercase, no spaces -- must match members.json

  return (
    <div style={{ textAlign: "center", padding: "1rem", fontFamily: "monospace" }}>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#888" }}>
        CFM Webring
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <a href={`https://cfmwebring.com/prev?from=${name}`}>&larr; prev</a>
        <a href="https://cfmwebring.com">CFM Ring</a>
        <a href={`https://cfmwebring.com/next?from=${name}`}>next &rarr;</a>
      </div>
    </div>
  );
}
```

### Minimal

```html
<a href="https://cfmwebring.com">CFM Webring &#x1F517;</a>
```

> **Replace `yourname`** with your first name (lowercase). This powers the prev/next navigation around the ring.

---

## Local Development

### Prerequisites

- **Node.js 18+**
- **npm**

### Frontend

```bash
cd cfm-webring
npm install
npm run dev          # starts on localhost:3000
```

### Backend (optional -- only needed for widget / navigate API)

```bash
cd cfm-backend
npm install
npm run dev          # starts on localhost:3001
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Architecture

```
CFM/
├── cfm-webring/                 # Next.js 16 frontend
│   ├── app/
│   │   ├── page.tsx             # Main page -- beat-sync loop, section assembly
│   │   ├── layout.tsx           # Root layout, font imports, OG metadata
│   │   ├── globals.css          # Global animations (scroll reveal, CRT, deco)
│   │   ├── lib/
│   │   │   ├── beats.ts         # Shared audio constants (BPM, interval, offset)
│   │   │   └── theme.ts         # Design tokens (colors, fonts, easing)
│   │   ├── hooks/
│   │   │   └── useAssetPreloader.ts  # Font/image/media preload with progress
│   │   └── components/
│   │       ├── WebringSection.tsx     # 3D canvas graph (render loop + interactions)
│   │       ├── webring/              # Extracted webring internals
│   │       │   ├── types.ts          # Node, Edge, Camera, FlyTo interfaces
│   │       │   ├── graph.ts          # Force-directed layout + graph builder
│   │       │   ├── camera.ts         # 3D projection, depth fog, easing
│   │       │   ├── SearchPanel.tsx    # Draggable search/filter panel
│   │       │   ├── ProfilePanel.tsx   # Selected member detail panel
│   │       │   └── ControlsBar.tsx    # Rotation/tilt/zoom sliders
│   │       ├── ClassCards3D.tsx       # CSS3DRenderer card grid
│   │       ├── class/                # Extracted class internals
│   │       │   ├── types.ts          # ClassMember, Social interfaces
│   │       │   ├── utils.ts          # Slug, initials, seeded PRNG
│   │       │   ├── createDecoElements.ts  # 3D background decorations
│   │       │   ├── createCardElement.ts   # Imperative card DOM builder
│   │       │   └── CRTOverlay.tsx    # TV power-on/off expanded view
│   │       ├── GithubSection.tsx     # GitHub stats terminal
│   │       ├── github/              # Extracted github internals
│   │       │   ├── data.ts          # Ticker items, positions, repo URL
│   │       │   ├── CommitBarChart.tsx # Canvas bar chart
│   │       │   ├── TitleNoise.tsx    # Pixel noise overlay
│   │       │   ├── PositionsPanel.tsx # Auto-scrolling allocations
│   │       │   └── GithubSection.css # Keyframes + hover styles
│   │       ├── AboutSection.tsx      # GSAP card stack, program info
│   │       ├── ClassSection.tsx      # Cohort filter + ClassCards3D
│   │       ├── Navbar.tsx            # Radix nav, imperative active state
│   │       ├── ReadyOverlay.tsx      # Loading screen + audio controls
│   │       ├── WebringBackground.tsx # Three.js star field + dust
│   │       ├── PixelTrail.tsx        # WebGL mouse trail
│   │       └── ...                   # MuteButton, ScrollReveal, tuners
│   ├── data/
│   │   └── members.json         # All member data -- edit this to join
│   └── public/
│       ├── images/              # Avatars, UI assets (webp/svg)
│       ├── fonts/               # ArcadeClassic, Geist, Three.js typeface
│       ├── music/               # Audio track (93 BPM)
│       └── videos/              # Hero landing video
│
└── cfm-backend/                 # Express API server
    └── src/
        ├── index.ts             # Server entry (CORS, routes, error handler)
        ├── lib/
        │   ├── dataLoader.ts    # Load + validate + cache members.json
        │   └── ringUtils.ts     # Webring navigation (next/prev)
        ├── routes/
        │   ├── members.ts       # GET /api/members
        │   ├── webring.ts       # GET /api/webring (sites only)
        │   ├── navigate.ts      # GET /api/navigate (prev/next)
        │   └── widget.ts        # GET /api/widget (embeddable HTML)
        └── types/
            └── index.ts         # Member + MembersData types
```

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| **Canvas-based webring** (not DOM) | Hundreds of nodes + edges need 60 fps; canvas with manual projection avoids DOM overhead |
| **CSS3DRenderer for cards** | Cards need real DOM (text, links, hover) but also 3D perspective tilt -- CSS3D bridges both |
| **Beat sync from `audio.currentTime`** | Clock-based timing drifts; reading directly from the audio element keeps animations locked to music |
| **Spring physics** (not CSS transitions) | Springs overshoot and bounce naturally; CSS transitions can only ease in/out |
| **Refs over state for animation** | Animation values change 60x/sec; React state would cause 60 re-renders/sec |
| **Asset preloader with timeout** | Guarantees the site becomes interactive within 15 s even if an asset stalls |

### Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| 3D | Three.js, React Three Fiber, Drei |
| Animation | GSAP, spring physics (manual rAF) |
| Fonts | ArcadeClassic (retro), Geist (system) |
| Backend | Express 5, TypeScript |
| Deploy | Vercel (frontend), any Node host (backend) |

---

## PR Checklist

Before submitting, make sure:

- [ ] Added your entry to `data/members.json`
- [ ] Avatar image is in `public/images/avatars/` (square, under 200 KB)
- [ ] All required fields are filled in
- [ ] `npm run build` passes with no errors
- [ ] Tested locally -- card renders, webring node appears
- [ ] (Bonus) Added the webring widget to your personal site

---

## Contributing

Beyond adding yourself to the ring, contributions to the site itself are welcome. Check the [issues](https://github.com/DanielWLiu07/CFM/issues) for open tasks, or open a new one if you have an idea.

When making code changes:

1. Create a feature branch (`feat/your-feature` or `fix/your-fix`)
2. Keep PRs focused -- one feature or fix per PR
3. Test locally with `npm run dev` and `npm run build`

---

<p align="center">
  <strong>Built with unhealthy amounts of Three.js by CFM students at UWaterloo.</strong>
</p>
