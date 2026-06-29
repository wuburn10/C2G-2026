# C2G 2026 — "Go Deeper" Web Booklet

A single-file, self-contained web booklet for the **Called to Greatness 2026** family camp
(UPC West Malaysia District Annual Family Camp · 30 July – 2 August 2026 · Grand Kampar Hotel).

## How to view
Open `index.html` in any web browser. That's it — no build step, no server required.
(It uses Google Fonts over the internet; if offline, it falls back to system fonts gracefully.)

## How to host (free options)
- **GitHub Pages** — push this folder to a repo, enable Pages on the `main` branch.
- **Netlify / Cloudflare Pages** — drag-and-drop the folder onto their dashboard.
- **Share as a file** — send `index.html` directly; it works on its own.

## Tech
- One `index.html`. Hand-written HTML + CSS + a small vanilla-JS block.
- No frameworks, no dependencies, no build tooling.
- Responsive (phone → desktop), respects `prefers-reduced-motion`, keyboard-navigable.

## Features
- Cinematic "descend into the deep" theme matched to the camp poster (teal → crimson).
- Live countdown to the camp, a scroll "depth gauge," and animated section reveals.
- **Live "you are here" schedule** — during camp the schedule reads the real clock
  (Malaysia time) and shows a status banner with **Happening now** / **Up next**, auto-opens
  the current day's tab, tags the live session **Now** and the following one **Next**, dims
  finished sessions, and labels each day **Today / Done / Soon**. Before camp it shows a
  countdown; after camp, a thank-you. A **Jump to now** button snaps to the live session.
- Sections: Hero · Welcome Messages · Speakers · Schedule (4-day tabs) · Rules ·
  Church Directory · Events · Departments · Connect.

### Preview the live schedule on any date
The "live" behaviour only shows during 30 Jul – 2 Aug 2026. To see it early, add a `?now=`
date to the URL, e.g. open:
`index.html?now=2026-07-31T09:15:00+08:00`
…and the page will behave as if it's Fri 31 July, 9:15 AM (mid-Morning-Service). Remove the
parameter for normal behaviour. Times are Malaysia time (UTC+8).

## ⚠️ Content carried over from the 2025 booklet — please review/update
Most factual content was reused from last year and updated to 2026 specifics
(theme, dates, venue, speakers). The following still need **your confirmation or new content**:

| Where | What to update |
|-------|----------------|
| **Speakers** | Add real bios + photos for Rev. Joel Bean & Rev. Lonnie Vestal. |
| **Welcome Messages** | The Rev. Sam Ponusamy & Rev. Joel Charles messages are lightly adapted drafts — confirm wording. |
| **Schedule** | Session/speaker assignments follow the 2025 pattern — confirm against the real 2026 programme. |
| **Hotel Rules** | Carried over from Casa Bonita 2025 — confirm against Grand Kampar Hotel's actual policy. |
| **Upcoming Events** | Currently "TBA" placeholders — add real future events. |
| **Departments** | 2025 team rosters — update names for the 2026 camp. |
| **Photos** | Speaker portraits and event photos are stylised placeholders (initials/gradients). |
| **Socials** | Facebook & YouTube links point to the platform home — swap in the exact page URLs. |

## How to edit
Everything is plain text in `index.html`. Search for a speaker name, a time, or a phone
number and edit it in place. To add a speaker photo, replace the `.photo` block's `<span class="mono">`
with an `<img src="..." alt="...">`.
