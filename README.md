# Application Copy Center

Companion site to [alfaj10408.github.io](https://alfaj10408.github.io/), published at
**https://alfaj10408.github.io/applications/**. A single page where every internship-application field (name,
employer, job title, dates, bullets, skills, publications…) has its own **Copy** button.

Built with [Hugo](https://gohugo.io/) and the HugoBlox modules used by the portfolio site (MIT License, © Lore Labs;
see [LICENSE.md](LICENSE.md)). Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Privacy model

- Everything in `data/application.yaml` is public professional content taken from the public CV.
- Fields marked `private: true` (phone, street address, ZIP, application answers) have **no value in this repo or in the
  built site**. They are typed into the page and saved in that browser's `localStorage` on that device only.
- Local edits to any other field are also stored only in `localStorage`. "Clear local data" removes them all after confirmation.
- No analytics, no third-party scripts, no network calls from the page script.
- The page is public. `robots.txt` asks crawlers not to index it, which is a courtesy, not protection.

## Updating content

1. Edit `data/application.yaml`. Structure: `sections[] → cards[] → fields[]` (+ optional `bullets[]`).
   - A field is `{id, label, value}`; add `multiline: true` for multi-paragraph text, `url:` for an "Open" link,
     `hint:` for a note under the value, `private: true` for browser-only fields (omit `value`).
   - `bullets[]` on a card produce "Bullet 1…n" fields plus a "Full description" field (bullets joined by newlines).
   - Keep ids stable: local overrides are keyed by `section.card.field`.
2. Bump `updated:` at the top of the file.
3. Commit and push to `main`; GitHub Actions rebuilds and deploys in about two minutes.

Only values that are documented in the CV belong in the data file. Unknown items should stay empty with a `hint`.

## Local preview

Requires Hugo Extended 0.162.0, Go, and Node 22.

```bash
npm install
hugo server          # http://localhost:1313/applications/
hugo --minify        # production build into public/
```
