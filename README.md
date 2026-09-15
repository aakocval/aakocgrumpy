# aakocbuddy

Give any picture a pair of eyes. Inspired by [page-mascot](https://github.com/nilbuild/page-mascot), but instead of picking from a set of pre-drawn characters, you upload your own image — a photo, a logo, anything — and it becomes a cursor-tracking, blinking mascot pinned to the corner of the page.

No AI, no server, no account. Everything happens in your browser.

## How it works

1. Upload an image.
2. Click where the left eye and right eye should sit on it.
3. A pair of googly eyes gets pinned to those spots. They track your cursor, blink on a random timer, and blink (with a little squish) when you click the mascot.

Your image and eye placement are saved to `localStorage`, so it's remembered on your next visit — nothing is uploaded anywhere.

## Run locally

No build step — it's plain HTML/CSS/JS.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Embed on your own site

Copy `index.html`, `styles.css`, and `script.js` into your project, or point an `<iframe>` at a deployed copy. The mascot renders as a `position: fixed` element pinned to a screen corner, so it floats above your existing page content.
