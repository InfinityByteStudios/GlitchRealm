# GlitchRealm Structural Reorganization Blueprint

## 📁 PART A: Current and Target Directory Trees

### A1. Current repository structure

This is the structure being reorganized. `functions/node_modules/` is intentionally omitted because it is generated dependency output, not application source.

```text
/
├── index.html, 404.html, blank.html, maintenance.html, offline.html
├── verification HTML files, favicon.ico, manifest.json
├── robots.txt, sitemap.xml, _headers, _redirects
├── netlify.toml, netlify.dev.toml, firebase.json, .firebaserc
├── package.json, package-lock.json, deno.lock
├── components/
│   ├── header.html
│   └── footer.html
├── css/                                [shared and feature styles]
├── js/                                 [all browser JavaScript mixed together]
├── assets/                             [images, icons, fonts, and logos]
├── Games/
│   └── UnderYourSkin/                  [WASM game]
├── config/                             [Firebase and quality configuration]
├── functions/                          [Firebase Cloud Functions]
├── netlify/functions/                  [Netlify serverless functions]
├── scripts/                            [deployment and maintenance scripts]
├── subdomains/
│   ├── GlitchRealm Portal/
│   ├── Sign In/
│   ├── School/                         [DO NOT TOUCH]
│   ├── admin/
│   ├── auth/
│   ├── developers/
│   ├── edu/
│   ├── help/
│   ├── legal/
│   ├── news/
│   └── pages/
├── supabase/                           [SQL setup]
├── utilities/
│   ├── Offline Game/
│   ├── SiteMaps/
│   ├── tests/
│   └── tools/
├── v2/                                 [deprecated second site version]
│   ├── DEPRECATED.md                   [reference-only; planned for removal]
│   ├── css/
│   ├── js/
│   └── HTML pages
├── sw.js
├── docs/
├── .github/
├── .kiro/
└── .vscode/
```

### A2. Wanted target repository structure

```text
/
├── apps/
│   ├── main/public/                         [NEW: main glitchrealm.ca site]
│   │   ├── index.html
│   │   ├── pages/
│   │   │   ├── account/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── community/
│   │   │   ├── games/
│   │   │   ├── info/
│   │   │   ├── legal/
│   │   │   └── newsletter/
│   │   ├── components/
│   │   ├── css/
│   │   ├── js/
│   │   │   ├── core/
│   │   │   ├── auth/
│   │   │   ├── games/
│   │   │   ├── community/
│   │   │   ├── admin/
│   │   │   ├── integrations/
│   │   │   └── ui/
│   │   ├── assets/
│   │   ├── Games/
│   │   │   └── UnderYourSkin/
│   │   ├── v2/                          [deprecated content; do not extend]
│   │   ├── utilities/
│   │   ├── sw.js
│   │   ├── manifest.json
│   │   ├── _headers
│   │   └── _redirects
│   ├── auth/public/                          [NEW: auth.glitchrealm.ca]
│   ├── news/public/                          [NEW: news.glitchrealm.ca]
│   ├── portal/public/                        [NEW: portal subdomain]
│   ├── admin/public/                         [NEW: admin subdomain]
│   ├── developers/public/                    [NEW: developers subdomain]
│   ├── edu/public/                           [NEW: education subdomain]
│   ├── help/public/                          [NEW: help subdomain]
│   └── legal/public/                         [NEW: legal subdomain]
├── services/
│   ├── firebase/
│   │   ├── functions/                         [moved from /functions]
│   │   ├── firestore.rules
│   │   ├── storage.rules
│   │   ├── database.rules.json
│   │   └── firestore.indexes.json
│   └── netlify/functions/                     [moved from /netlify/functions]
├── infrastructure/
│   ├── netlify/
│   │   ├── main.toml
│   │   └── subdomains/
│   ├── firebase.json
│   ├── .firebaserc
│   ├── lighthouse/
│   └── supabase/
├── tooling/                                   [moved from /scripts]
├── tests/
│   ├── browser/
│   ├── integration/
│   └── legacy-html/
├── docs/                                      [retained]
├── subdomains/School/                         [FROZEN: do not touch]
├── package.json                               [tooling manifest]
└── LICENSE, LICENSE-ASSETS, NOTICE, README.md
```

The target structure separates deployable applications, backend services, infrastructure, tooling, tests, and documentation. `subdomains/School/` remains in place and is frozen.

The deployed URL structure should remain unchanged. Netlify publish directories must point to the appropriate `apps/*/public` directory, so `/js/...`, `/css/...`, `/pages/...`, and `/components/...` continue resolving from the same public URLs.

## 🔀 PART B: File-by-File Shuffling Blueprint

| Original Path | Target Path | Purpose / Structural Benefit |
| :--- | :--- | :--- |
| `index.html`, `404.html`, `blank.html`, `maintenance.html`, `offline.html` | `apps/main/public/` | Main-site entry points grouped under one deployable application. |
| Root verification HTML files | `apps/main/public/` | Preserve Google and domain-verification URLs. |
| `components/` | `apps/main/public/components/` | Centralize runtime-loaded header/footer fragments. |
| `css/` | `apps/main/public/css/` | Keep shared browser styles in the main public bundle. |
| `js/firebase-core.js`, `firebase-config-glitchrealm.js`, `dev-config.js` | `apps/main/public/js/core/` | Isolate Firebase and environment initialization. |
| `auth-*.js`, `signin.js`, `auth-sync.js` | `apps/main/public/js/auth/` | Group authentication behavior. |
| `game-*.js`, `game-launcher*.js`, `play-now-enhancement.js`, `wishlist-manager.js` | `apps/main/public/js/games/` | Group game-launching and game-state logic. |
| `community.js`, `article.js`, `publish.js`, `request-verification.js` | `apps/main/public/js/community/` | Separate community and publishing features. |
| `admin.js`, `moderation.js` | `apps/main/public/js/admin/` | Separate administrative functionality. |
| `supabase-*.js`, `gravatar-integration.js`, `*-avatar-integration.js` | `apps/main/public/js/integrations/` | Isolate third-party integrations. |
| `script.js`, `accessibility-keyboard-nav.js`, `cookie-consent.js`, `glitch-settings.js`, `performance-optimization.js`, `seasonal-effects.js`, `site-banners.js`, `maintenance-check.js` | `apps/main/public/js/ui/` | Separate UI behavior from services. |
| `assets/` | `apps/main/public/assets/` | Main-site static assets and branding. |
| `Games/UnderYourSkin/` | `apps/main/public/Games/UnderYourSkin/` | Preserve game URL and WASM asset locality. |
| `subdomains/pages/` | `apps/main/public/pages/` | Preserve existing `/pages/...` routes. |
| `v2/` HTML, CSS, and JavaScript | `apps/main/public/v2/` temporarily | Preserve the experimental `/v2/...` route during migration; do not add new features. |
| `v2/DEPRECATED.md` | `docs/` archive or remove with `v2/` | Documents that the v2 portal is reference-only and planned for deletion; it is not a public runtime asset. |
| `utilities/Offline Game/` | `apps/main/public/utilities/offline-game/` | Keep the offline game deployable but separate from core pages. |
| `utilities/SiteMaps/` | `tooling/sitemaps/` | Treat generated sitemap artifacts as tooling output. |
| `utilities/tests/` | `tests/legacy-html/` | Remove test pages from production publishing. |
| `functions/` | `services/firebase/functions/` | Establish a clear Firebase backend boundary. |
| `netlify/functions/` | `services/netlify/functions/` | Isolate Netlify serverless endpoints. |
| `config/firestore.rules`, `storage.rules`, `database.rules.json`, `firestore.indexes.json` | `services/firebase/` | Keep Firebase security and indexing beside Firebase functions. |
| `config/lighthouse-budget.json`, `lighthouserc.json` | `infrastructure/lighthouse/` | Separate quality configuration from runtime configuration. |
| `scripts/` | `tooling/` | Consolidate maintenance, validation, deployment, and asset scripts. |
| `supabase/` | `infrastructure/supabase/` | Place storage-schema infrastructure beside other infrastructure. |
| `firebase.json`, `.firebaserc` | `infrastructure/` | Centralize deployment configuration. |
| `netlify.toml`, `netlify.dev.toml` | `infrastructure/netlify/` | Separate Netlify production and development configuration. |
| `subdomains/auth/` | `apps/auth/public/` | Self-contained auth deployment. |
| `subdomains/news/` | `apps/news/public/` | Self-contained news deployment. |
| `subdomains/GlitchRealm Portal/` | `apps/portal/public/` | Self-contained portal deployment. |
| `subdomains/admin/` | `apps/admin/public/` | Self-contained admin deployment. |
| `subdomains/developers/` | `apps/developers/public/` | Self-contained developer deployment. |
| `subdomains/edu/` | `apps/edu/public/` | Self-contained education deployment. |
| `subdomains/help/` | `apps/help/public/` | Self-contained help deployment. |
| `subdomains/legal/` | `apps/legal/public/` | Self-contained legal deployment. |
| `subdomains/Sign In/` | `apps/auth/public/legacy-signin/` | Fold the duplicate sign-in surface into auth. |
| `subdomains/School/` | No move | Explicitly excluded from this reorganization. |
| `utilities/tests/` | `tests/legacy-html/` | Keep test pages out of production deployment. |
| `functions/package.json` | `services/firebase/functions/package.json` | Make backend dependencies authoritative. |
| `functions/node_modules/` | No target; remove from version control separately | Restore dependencies from lockfiles rather than Git. |

## ⚠️ PART C: Critical Dependency & Import Updates

Most dependencies are HTML `src`, `href`, and runtime `fetch()` paths rather than ES module imports. These must be treated as import-equivalent dependencies.

### Main-site HTML

All HTML files referencing `js/`, `css/`, `components/`, or `assets/` require updates:

- Root entry points: `index.html`, `404.html`, `blank.html`, `maintenance.html`, and `offline.html`.
- Every page under `subdomains/pages/`.
- Every page under `subdomains/developers/`.
- Every page under `v2/`; exclude `v2/DEPRECATED.md` from public asset and route checks.

Use canonical deployed paths:

```text
js/file.js        -> /js/<new-category>/file.js
css/file.css      -> /css/file.css
assets/...        -> /assets/...
components/...    -> /components/...
```

### Shared runtime

- `js/script.js`: update categorized module references and preserve runtime fetches for `/components/header.html` and `/components/footer.html`.
- `js/game-launcher-lazy.js`: update lazy-loaded game module paths.
- `js/firebase-core.js`: update local module paths if any are introduced.
- `sw.js`: update every precache entry and increment the cache version.

### Shared component fetches

Pages currently using relative `components/...` fetches must use the canonical main-site URL when hosted on a subdomain:

```text
https://glitchrealm.ca/components/header.html
https://glitchrealm.ca/components/footer.html
```

Affected areas include:

- `subdomains/pages/account/*`
- `subdomains/pages/legal/*`
- `subdomains/pages/info/*`
- `subdomains/pages/newsletter/*`
- `subdomains/pages/games/leaderboards.html`
- `subdomains/news/request-verification.html`

Keep news and portal-local component fetches local:

- `subdomains/news/script.js`
- `subdomains/news/request-verification.html`
- `subdomains/GlitchRealm Portal/script.js`

### Tooling paths

Update filesystem paths in:

- `scripts/update-favicon.js`
- `scripts/validate-seo.js`
- `scripts/add-critical-preloads.js`
- `scripts/update-html-images.js`
- `scripts/generate-sitemap.js`
- `scripts/optimize-images.js`
- `scripts/validate-optimizations.js`
- `scripts/validate-optimizations.mjs`

Filesystem paths should use `apps/main/public/...`; generated browser URLs must remain unchanged.

### Deployment configuration

- `firebase.json`: update `functions.source` and all rules/index paths.
- `netlify.toml`: publish `apps/main/public`; update exclusions for functions and games.
- `netlify.dev.toml`: update local publish and redirect paths.
- Each subdomain `netlify.toml`: publish the corresponding `apps/<name>/public`.

### Backend imports

Update local `require()` and `import` paths in:

- `functions/index.js`
- `functions/prerender.js`
- `functions/support-proxy.js`
- Every file under `netlify/functions/`

Confirm Netlify functions still resolve `lib/content-filter.mjs`.

### Documentation and automation

Update repository paths in:

- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/SEO_ADSENSE_IMPLEMENTATION.md`
- `.github/copilot-instructions.md`
- Related deployment and testing documentation.

### Manifest and service-worker scope

Review:

- `manifest.json`
- `sw.js`
- `robots.txt`
- `sitemap.xml`

Preserve public URLs, update internal paths only where files physically move, and verify service-worker scope remains `/`.

## 🛠️ PART D: Step-by-Step Migration Order

1. **Create a machine-readable inventory.** Record every tracked file, public URL, script reference, stylesheet reference, fetch path, Firebase path, and Netlify publish directory. Exclude `subdomains/School/` completely.

2. **Freeze current behavior.** Run the existing Netlify development setup and capture smoke-test results for authentication, game launching, header/footer loading, news, submissions, admin pages, service workers, and redirects.

3. **Create deployment manifests.** Add main-site and subdomain publish mappings without moving application files. Validate that each Netlify site still publishes successfully.

4. **Move infrastructure configuration.** Move Firebase rules, indexes, Firebase Functions, Netlify Functions, Supabase SQL, and quality configuration. Update `firebase.json` before deployment. **High risk:** immediately run Firebase rules validation and Functions linting.

5. **Move shared static resources.** Move assets, CSS, components, manifests, SEO files, and root HTML into `apps/main/public`. **High risk:** test header/footer loading on root pages and all `/pages/...` routes.

6. **Move low-dependency JavaScript.** Move Firebase configuration, environment configuration, accessibility helpers, cookie consent, and integrations. Update HTML references before moving orchestrators. Run syntax checks and browser smoke tests.

7. **Move feature JavaScript.** Move authentication, games, community, admin, and UI modules into categorized directories. Update script tags, lazy-load paths, and runtime `import()` calls. **High risk:** immediately test sign-in persistence, sign-out, game launch, playtime tracking, and admin authorization.

8. **Move main pages.** Move `subdomains/pages/*` into `apps/main/public/pages/*`. Replace relative component fetches with canonical main-site component URLs. **High risk:** crawl every account, games, legal, info, community, and newsletter page.

9. **Move independent subdomain applications.** Migrate auth, news, portal, admin, developers, education, help, and legal one at a time. Test each deployed host independently.

10. **Move games, v2, and offline utilities.** Move the WASM game without changing its public URL. Move `v2` and the offline game after the main site is stable. **High risk:** test WASM loading, cross-origin isolation headers, service-worker behavior, and offline fallback.

11. **Move tests and tooling.** Move legacy test pages out of production publish directories. Update tooling filesystem paths. Add path-integrity checks that fail on missing scripts, stylesheets, components, images, or Firebase configuration.

12. **Reconcile package manifests.** Keep backend dependencies in `services/firebase/functions/package.json` and tooling dependencies in the root `package.json`. Resolve the current version mismatch between root and Functions manifests. Stop tracking `functions/node_modules` and restore dependencies from lockfiles.

13. **Update the service worker and cache policy.** Regenerate precache paths, increment the cache version, verify old caches are invalidated, and confirm new assets load correctly.

14. **Run final validation.**

    - `netlify dev`
    - HTML/link/path crawl
    - JavaScript syntax validation
    - Functions lint
    - Firebase rules deployment validation
    - Auth and Firestore smoke tests
    - WASM game test
    - Lighthouse/performance checks
    - Netlify deploy preview

15. **Deploy incrementally.** Deploy infrastructure first, the main site second, low-risk subdomains next, and auth, news, admin, and developer surfaces last. Keep rollback copies of all Netlify and Firebase configuration until production verification completes.
