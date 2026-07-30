# C2G 2026 — "Go Deeper" Web Booklet

Web booklet for the **Called to Greatness 2026** family camp
(UPC West Malaysia District Annual Family Camp · 30 July – 2 August 2026 · Grand Kampar Hotel).

booklet.c2g.upcmalaysia.com

## Link preview image

Sharing the booklet link on WhatsApp (also Telegram, Facebook, iMessage, X) shows a
1200×630 preview card: `assets/img/og-preview.png`, wired up by the `og:*` /
`twitter:*` tags in the `<head>` of `index.html`.

The artwork is generated, not hand-drawn — edit `assets/og/og-image.html`
(plain HTML/CSS, matched to the booklet hero) and re-render:

```
node assets/og/render.mjs
```

Needs Node 22+ and a Chrome/Chromium on the machine; set `CHROME_PATH` if it can't
find one. The script inlines the web fonts before screenshotting, so the render
never depends on Google Fonts being reachable at capture time.

Two things to know when changing it:

- **Keep the URLs absolute.** WhatsApp will not resolve a relative `og:image`.
- **WhatsApp caches previews hard.** After re-rendering, bump the `?v=` number on
  the `og:image` / `twitter:image` URLs in `index.html`, otherwise already-shared
  links keep showing the old card. Re-scraping the page with
  [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
  refreshes it sooner, and test in a fresh chat — WhatsApp reuses the preview it
  already has for a link in an existing thread.
