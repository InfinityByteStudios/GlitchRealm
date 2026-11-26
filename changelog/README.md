# GlitchRealm Changelog

This directory holds the public changelog. `versions.json` is the committed,
permanent release manifest; every other file in this directory is regenerated
on each Netlify build by `scripts/changelog/generate.js` and deployed statically.

- Overview: `/changelog/` (complete discovery index of every published release)
- Release pages: `/changelog/vX-Y-Z/`
- RSS: `/changelog/feed.xml` — Atom: `/changelog/atom.xml`
- JSON index: `/changelog/releases.json` (schema: `/changelog/releases.schema.json`)

Full documentation: `docs/CHANGELOG_SYSTEM.md`.

## Editing a release by hand

Edit `versions.json`, set `"humanEdited": true` on the release record and
modify `title` / `summary` / `description`. Human edits survive regeneration.
Do not delete published release records — published history is permanent.
