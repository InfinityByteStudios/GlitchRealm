# GlitchRealm Changelog & Automated Version Management System

This document explains how the automated version management, changelog and
release-discovery system works, how to operate it, and how to troubleshoot it.

The system is entirely Git-based and static: Git is the source of truth, there
is no database, no continuously running server and no additional paid service.
Everything public is generated at Netlify build time and served from the CDN.

---

## 1. How automatic versioning works

Every Netlify build runs `node scripts/changelog/generate.js` (configured in
`netlify.toml`, before the prerender and sitemap steps). The pipeline:

1. Walks the first-parent history of `HEAD` and builds **change units**:
   - a **pull-request merge** (a merge commit plus the commits it introduced)
     is exactly one change — merge commits are never counted as separate
     changes, and branch-internal merges are filtered out;
   - a **direct commit** on the mainline (squash merge or a regular push) is
     its own change.
2. Determines the **published frontier**: the newest commit already covered by
   a published release (from the committed manifest `changelog/versions.json`
   and/or semver Git tags).
3. Collects every commit **after** the frontier — this is the next release.
4. Classifies all changes (see §2), calculates the next semver version
   (see §3), generates human-readable descriptions (see §4), merges the result
   into the committed manifest, renders all public artifacts and validates
   everything before publishing (see §5).

If no commits exist after the frontier, the build simply regenerates the
artifacts — no release is created and nothing is published twice.

## 2. How commits are classified

Classification combines three signals, in order of strength:

1. **Conventional Commits** in the subject:
   | Subject | Level |
   |---|---|
   | `feat:` | MINOR (New Features) |
   | `fix:` | PATCH (Bug Fixes) |
   | `perf:` | PATCH (Performance) |
   | `docs:`, `chore:`, `ci:`, `build:`, `test:` | PATCH (Maintenance) |
   | `refactor:`, `style:` | PATCH (Improvements) |
   | `feat!:` / `fix!:` (bang after type) | MAJOR |
   | `BREAKING CHANGE:` footer in the body | MAJOR |
2. **GitHub PR labels** (when the API is reachable): `breaking` → MAJOR,
   `feature`/`enhancement` → MINOR, `bug`/`fix` → PATCH, `security` → Security
   category, `performance` → Performance, `docs`/`chore`/`dependencies` →
   Maintenance.
3. **Conservative keyword fallback** for plain commit subjects (add/introduce →
   feature, fix/regression → fix, performance/faster → perf, security/CVE →
   security, default → maintenance/PATCH). Nothing is guessed beyond that.

When several commits are grouped into one release, the highest level wins:
MAJOR > MINOR > PATCH. A release containing only fixes is a PATCH release;
one fix plus one feature is a MINOR release.

Commits can be excluded from releases entirely by setting
`CHANGELOG_EXCLUDE_TYPES` (comma-separated Conventional Commit types, e.g.
`docs,chore`).

## 3. How multiple commits become one release

All commits since the last published frontier belong to **one** release.
There is never a separate version per commit. Examples:

- Previous `v1.4.2`, changes: fix auth, improve loading, add dashboard, fix nav
  → one release `v1.5.0` (a MINOR beats the PATCHes).
- Previous `v1.5.0`, changes: fix image rendering, fix broken links, improve
  loading speed → one release `v1.5.1`.

## 4. How release descriptions are generated

Deterministic templates always run first: commit subjects are cleaned
(Conventional prefixes and agent task IDs removed, first verb converted to
past tense) and the affected audience is derived from the files actually
changed (players, creators, developers, administrators, infrastructure…).
Nothing is invented.

When the **Netlify AI Gateway** is configured (it is injected automatically
when AI features are enabled for the project), the rendered entries and the
release title/summary are polished by the configured model — by default
**MiniMax M3.1 Flash** (`minimax/minimax-m3.1-flash`). The model may only
rephrase the facts it is given; a malformed or unavailable response silently
falls back to the deterministic templates. AI results are cached in
`scripts/changelog/.ai-cache.json` keyed by content hash, so repeated builds
do not re-bill the gateway for unchanged releases.

To edit generated descriptions by hand, edit `changelog/versions.json`, set
`"humanEdited": true` on the release record and change `title`, `summary` or
`description`. Human edits survive every regeneration. If you edit a record,
also leave `status`/`publishedAt` untouched unless you intend to change them.

## 5. How releases are published

The pipeline is auto-publishing by default (`CHANGELOG_AUTO_PUBLISH=true`):
a computed release is recorded as `published` in the manifest during the build
and rendered to the public site immediately.

- **Empty releases are never published** (no commits after the frontier, or
  every commit excluded by configuration → no release).
- **Versions are never downgraded or duplicated**; a duplicate version aborts
  the build with an error.
- Set `CHANGELOG_AUTO_PUBLISH=false` to record computed releases as `draft`
  instead; drafts never appear on the site, in the feeds, in `releases.json`
  or in the sitemap until the record's `status` is changed to `published` in
  the manifest.
- The **first release** (no tags, no published record) uses the configured
  initial version — `CHANGELOG_INITIAL_VERSION` (default `1.0.0`). Set
  `CHANGELOG_INITIAL_VERSION=none` to disable initial publication entirely
  (nothing is guessed).

### Timestamps

Four different timestamps are kept, all stored in UTC (ISO 8601):

| Field | Meaning |
|---|---|
| `authoredAt` | original author timestamp of a commit |
| `committedAt` | committer timestamp of a commit |
| `mergedAt` | when a PR landed on the mainline (merge commit, or the PR's `merged_at` from the GitHub API when available) |
| `publishedAt` | when the release was published (recorded in the manifest; for a freshly computed release it is the committer timestamp of the newest change in the release, so it stays stable across rebuilds — build times are recorded separately in `generatedAt`) |

Build timestamps are never substituted for commit timestamps.

## 6. How Git tags are managed

Tags are the preferred permanent anchor for releases. When tags are available
the pipeline uses the newest semver tag as the version base and release
boundary. Tag names must match `vX.Y.Z` (e.g. `v1.5.0`).

To finalize a release permanently:

```bash
git tag v1.5.0
git push origin main --tags
```

If tag access is unavailable in a given environment (some sandboxed CI
contexts), the pipeline reports it and continues with manifest-based
versioning — generation never breaks because of it.

## 7. Generated artifacts and URL structure

Everything below is regenerated on every deploy (the committed part is the
manifest only):

| URL | File | Purpose |
|---|---|---|
| `/changelog/` | `changelog/index.html` | overview; complete discovery index |
| `/changelog/vX-Y-Z/` | `changelog/vX-Y-Z/index.html` | one page per published release |
| `/changelog/feed.xml` | `changelog/feed.xml` | RSS 2.0 (published releases only) |
| `/changelog/atom.xml` | `changelog/atom.xml` | Atom 1.0 |
| `/changelog/releases.json` | `changelog/releases.json` | machine-readable release index |
| `/changelog/releases.schema.json` | `changelog/releases.schema.json` | JSON Schema for the index |
| `changelog/versions.json` | committed | permanent release manifest |

The sitemap (`scripts/generate-sitemap.js`) automatically includes the
changelog overview and every published release page, and fails the build if
any published release URL is missing. The edge function
(`netlify/edge-functions/sitemap.js`) overlays live game URLs from Firestore
and merges the changelog URLs from `releases.json` so the live sitemap stays
complete between deploys.

If the release history grows beyond `CHANGELOG_PAGINATION_SIZE` releases, the
overview paginates (`/changelog/page-2/` …); every page is linked with plain
HTML anchors and every release stays discoverable without JavaScript.

## 8. How crawlers and AI agents discover historical releases

- The overview page renders **every** published release (version, title,
  date, summary, categories) inside ordinary `<a href>` links in the initial
  HTML — no JavaScript, no lazy loading, no API calls.
- Each release page contains the complete release content, previous/next
  navigation, canonical URL, Open Graph metadata and JSON-LD (`TechArticle` +
  `BreadcrumbList`).
- The crawler test (`scripts/changelog/crawl-check.js`, also run inside every
  generation) simulates a JS-disabled crawler: it reads the overview, follows
  every release link, verifies each page's content and cross-checks the
  releases.json index, both feeds and the sitemap. Any missing release fails
  the build.
- `robots.txt` explicitly allows `/changelog/` for all crawlers, including
  search crawlers (Googlebot, Bingbot) and AI crawlers (OAI-SearchBot,
  ChatGPT-User, GPTBot, ClaudeBot, PerplexityBot). `llms.txt` is a
  supplemental discovery document — the HTML, JSON and feeds remain the
  source of truth.

## 9. Netlify deployment

The production build command in `netlify.toml`:

```
node scripts/changelog/generate.js && node scripts/generate-prerendered-content.js && node scripts/generate-sitemap.js
```

Order matters: the changelog step writes the manifest that the sitemap step
reads. The deploy itself is a plain static deploy — no functions are required
to serve any changelog content, and no database is provisioned.

GitHub enrichment uses `GITHUB_TOKEN`/`GH_TOKEN` when present; without a token
it works unauthenticated and degrades gracefully on rate limits (a warning is
logged, generation continues). To enrich PR titles/labels/merge timestamps
reliably, add a fine-grained read-only `GITHUB_TOKEN` as a Netlify
environment variable.

There is no risk of infinite build loops: Netlify builds never commit to the
repository, and regeneration is idempotent (no new commits → no new release).

## 10. Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `CHANGELOG_INITIAL_VERSION` | `1.0.0` | first release version when no tag/record exists (`none` disables) |
| `CHANGELOG_AUTO_PUBLISH` | `true` | publish computed releases, or record as drafts |
| `CHANGELOG_EXCLUDE_TYPES` | *(empty)* | Conventional Commit types to exclude |
| `CHANGELOG_AI_ENABLED` | `true` | AI polish on/off |
| `CHANGELOG_AI_MODEL` | `minimax/minimax-m3.1-flash` | AI Gateway model |
| `CHANGELOG_AI_TIMEOUT_MS` | `45000` | AI call timeout |
| `CHANGELOG_GITHUB_PR_LIMIT` | `60` | max PRs enriched per run |
| `CHANGELOG_BASELINE_MAX_ENTRIES` | `30` | entries listed on the first (baseline) release |
| `CHANGELOG_MAX_ENTRIES` | `100` | max entries rendered per release page |
| `CHANGELOG_PAGINATION_SIZE` | `60` | releases per overview page before pagination |
| `CHANGELOG_SITE_URL` | `https://glitchrealm.ca` | canonical site origin |
| `GITHUB_TOKEN` / `GH_TOKEN` | *(empty)* | optional GitHub API token |

Netlify AI Gateway credentials (`NETLIFY_AI_GATEWAY_URL`,
`NETLIFY_AI_GATEWAY_KEY`) are injected by the platform when AI features are
enabled; they are read-only inputs and never written to artifacts.

## 11. Commands

```bash
npm run changelog:generate   # run the pipeline (same as during builds)
npm run changelog:test       # run the test suite (node --test)
npm run changelog:crawl      # run the crawler discovery check
node scripts/changelog/generate.js --dry-run   # no writes
node scripts/changelog/generate.js --out DIR   # write artifacts elsewhere
node scripts/changelog/generate.js --report FILE.json # machine-readable run report
```

## 12. Troubleshooting

**Build fails with "Refusing to publish duplicate version"** — a tag or a
manifest record already uses that version. Tag the release or advance the
commits; never delete published records manually.

**Build fails with "Crawler discovery test failed"** — a release page or link
is missing from the generated tree. Re-run `npm run changelog:generate`
locally; the error lists exactly what a crawler could not find.

**"GitHub API rate limit reached"** — enrichment was skipped; the release was
still generated from Git data. Add a `GITHUB_TOKEN` environment variable to
raise the rate limit.

**"Tags unavailable"** — the environment cannot read tags; versioning
continues from the committed manifest. Tag releases from a normal git
checkout.

**Descriptions look generic** — AI polish was unavailable (gateway disabled,
timeout or malformed response). The deterministic templates are used instead;
retry the build or edit the record with `humanEdited: true`.

**Failed builds never destroy history** — the manifest is written atomically
(temp file + rename) and rendered artifacts are validated in a temporary
directory before replacing live files. If validation fails, the previous
manifest and artifacts stay untouched.

## 13. Publishing the first release — what happened here

The repository had no tags and no previous release records. The first build
published the **baseline release `v1.0.0`** — an explicit, configurable
baseline (`CHANGELOG_INITIAL_VERSION=1.0.0`) that records the platform state
at the moment the changelog system was adopted. It covers the repository's
full Git history, lists the most recent changes in full and states the total
commit/PR counts honestly. After the baseline, every subsequent release is
computed only from commits newer than the last published one.

To make the baseline (or any later release) permanent in Git, tag it:

```bash
git tag v1.0.0 && git push origin main --tags
```

The committed manifest (`changelog/versions.json`) also preserves the release
permanently, so tagging is recommended but not required.
