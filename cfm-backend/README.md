# CFM Webring

Welcome to the CFM Webring! This is a list of current / past CFM cohorts, organized by graduation year.

🚧 **This project is currently a work in progress** 🚧

---

## How to Join

1. Open the `cfm-backend/src/data/members.json` file
2. Add your information to the array following the structure below
3. Submit a PR!

---

## Member Format

Add your entry using this structure:

```json
{
  "name": "Your Name",
  "url": "https://yourwebsite.com",
  "description": "Short tagline / header",
  "location": "Your City, Province",
  "blurb": "A longer description about you",
  "cohort": "graduating-year",
  "avatar": "/images/avatars/yourname.png",
  "hobbies": ["hobby1", "hobby2", "hobby3"],
  "experiences": ["Experience 1", "Experience 2"],
  "socials": [
    { "type": "github", "url": "https://github.com/yourusername" },
    { "type": "linkedin", "url": "https://linkedin.com/in/yourprofile" }
  ]
}
```

---

## Example

```json
{
  "name": "Aadya Khanna",
  "url": "https://aadyakhanna.com",
  "description": "Builder, Creative-Techie, Guitarist",
  "location": "Toronto, ON",
  "blurb": "Drawn to the intersection of technology, creativity, and financial markets",
  "cohort": "2030",
  "avatar": "/images/avatars/aadyakhanna.png",
  "hobbies": ["hackathons", "music", "guitar"],
  "experiences": ["Product Engineer @ Zafin"],
  "socials": [
    { "type": "github", "url": "https://github.com/aadya-khanna" },
    { "type": "linkedin", "url": "https://linkedin.com/in/aadya-khanna" }
  ]
}
```

---

## Important Notes

* The `members.json` file is a **flat array** of all members
* Ensure **all links are valid and working**
* Make sure your avatar path is correct
* Use `#` for socials you don't have (or omit them entirely)
* `cohort` is your graduation year (e.g. "2029")
* Keep blurbs short and fun
