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
├── netlify.toml                           [CANONICAL: must remain at repo root]
├── firebase.json                          [CANONICAL: Firebase CLI entry point]
├── .firebaserc                            [CANONICAL: Firebase project selection]
├── package.json                           [root dependency resolution for Netlify]
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
│   │   ├── main.toml                    [reference/overlay; root netlify.toml is canonical]
│   │   └── subdomains/
│   ├── lighthouse/
│   └── supabase/
├── tooling/                                   [moved from /scripts]
├── tests/
│   ├── browser/
│   ├── integration/
│   └── legacy-html/
├── docs/                                      [retained]
├── subdomains/School/                         [FROZEN: do not touch]
├── package.json                               [tooling and Netlify dependency manifest]
└── LICENSE, LICENSE-ASSETS, NOTICE, README.md
```

The target structure separates deployable applications, backend services, infrastructure, tooling, tests, and documentation. Netlify and Firebase root entry points intentionally remain at the repository root because both CLIs resolve these files by convention. `subdomains/School/` remains in place and is frozen.

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
| `netlify/functions/` | `services/netlify/functions/` | Isolate Netlify serverless endpoints; requires a root `[functions] directory = "services/netlify/functions"` setting. |
| `config/firestore.rules`, `storage.rules`, `database.rules.json`, `firestore.indexes.json` | `services/firebase/` | Keep Firebase security and indexing beside Firebase functions. |
| `config/lighthouse-budget.json`, `lighthouserc.json` | `infrastructure/lighthouse/` | Separate quality configuration from runtime configuration. |
| `scripts/` | `tooling/` | Consolidate maintenance, validation, deployment, and asset scripts. |
| `supabase/` | `infrastructure/supabase/` | Place storage-schema infrastructure beside other infrastructure. |
| `firebase.json`, `.firebaserc` | Remain at repository root | Firebase CLI resolves these as project entry points; update their internal paths instead of moving them. |
| `netlify.toml` | Remain at repository root | Netlify reads the canonical site configuration from the repository root. |
| `netlify.dev.toml` | `infrastructure/netlify/netlify.dev.toml` plus root invocation flag | Keep development overrides separate, but invoke Netlify with `--config` explicitly. |
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
| `functions/package.json` | `services/firebase/functions/package.json` | Keep Firebase Functions dependencies authoritative for Firebase deployment. |
| Root `package.json` | Remain at repository root | Netlify Functions currently bundle against root dependencies; retain `firebase-admin` and add `@anthropic-ai/sdk` before relying on `ai-chat.js`. |
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

- `netlify.toml` must remain at the repository root. It is the canonical production configuration; `infrastructure/netlify/` may contain documented copies or overlays, but Netlify must not depend on a moved file.
- Add `[build] publish = "apps/main/public"` only after all root-site assets and routed content are inside that publish tree.
- Add `[functions] directory = "services/netlify/functions"` if Netlify Functions are moved. Update every `included_files` path because those paths are resolved relative to the configured functions directory.
- Decide the fate of `emails/` before moving functions. Preserve the directory at the location expected by `@netlify/plugin-emails`, or update the plugin configuration and verify form processing in a deploy preview.
- The current root `_redirects` points many host and route rewrites at `/subdomains/...`. Either keep those target files under `apps/main/public/subdomains/...` or rewrite every rule to the new public path before changing `publish`.
- Verify redirect precedence between `netlify.toml` and `_redirects`. The catch-all `/* -> /404.html` rule in `netlify.toml` may shadow `_redirects`; test current behavior and remove or narrow the catch-all only as an intentional, verified change.
- Preserve `[build.environment]` values, `[context.production.environment] NETLIFY_AI_GATEWAY_ENABLED`, plugin blocks, headers, redirects, and sitemap `buildDir` behavior in the root configuration.
- `netlify.dev.toml` may live under `infrastructure/netlify/`, but local commands must pass `--config infrastructure/netlify/netlify.dev.toml` explicitly.
- Each subdomain is not automatically an independent Netlify site. Confirm the Netlify UI base directory and publish directory first. Only move `subdomains/help/` and `subdomains/GlitchRealm Portal/` into independent app roots after their site configuration is verified.
- `firebase.json` and `.firebaserc` must remain at the repository root. Update `firebase.json` to point `functions.source` to `services/firebase/functions` and rules/index paths to `services/firebase/...`; alternatively use explicit Firebase CLI `--config` and `--project` flags for every command.

### Backend imports

Update local `require()` and `import` paths in:

- `functions/index.js`
- `functions/prerender.js`
- `functions/support-proxy.js`
- Every file under `netlify/functions/`

Confirm Netlify functions still resolve `lib/content-filter.mjs`.

### Netlify dependency and plugin safeguards

- Netlify Functions currently resolve dependencies from the root `package.json`; do not remove `firebase-admin` from root dependencies when moving Firebase Functions.
- Add and lock `@anthropic-ai/sdk` before treating `netlify/functions/ai-chat.js` as deployable; it is currently imported but absent from the manifests.
- Keep separate dependency manifests for Firebase Functions and Netlify Functions only if each deployment has an explicit install/bundle boundary and lockfile.
- Confirm `NETLIFY_AI_GATEWAY_URL` and `NETLIFY_AI_GATEWAY_KEY` are available in the production function environment before changing the AI Gateway configuration. `submit-review.js` must not silently lose moderation capability.
- Verify `@netlify/plugin-emails`, its edge-function behavior, and any `emails/` templates in a deploy preview. The repository currently has no tracked `emails/` directory, so this must be resolved rather than assumed.

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

3. **Freeze CLI entry points.** Keep root `netlify.toml`, `firebase.json`, and `.firebaserc` in place. Add no new publish directory or functions directory yet. Record Netlify UI base directories, publish directories, installed plugins, edge functions, and environment variables for every site.

4. **Validate current Netlify behavior.** Confirm whether the root `netlify.toml` catch-all 404 rule shadows `_redirects`, and test portal, admin, developer, legal, education, auth, and sign-in host rewrites. Do not treat `_redirects` as effective until verified.

5. **Prepare configuration changes without moving files.** Add a root `[functions] directory` only if the Netlify Functions move is approved. Preserve environment variables, plugin configuration, email settings, AI Gateway settings, headers, redirects, and sitemap behavior. **High risk:** deploy a preview and verify function discovery, edge/plugin functions, forms, and AI moderation.

6. **Move Firebase infrastructure.** Move rules, indexes, and Firebase Functions only after updating root `firebase.json` paths to `services/firebase/...`. Keep `.firebaserc` at root. **High risk:** immediately run Firebase rules validation, Functions linting, and an emulator/deploy-preview smoke test.

7. **Move shared static resources.** Move assets, CSS, components, manifests, SEO files, and root HTML into `apps/main/public`. Before changing `publish`, rewrite every `_redirects` target currently pointing at `/subdomains/...`, or preserve those files under `apps/main/public/subdomains/...`. **High risk:** test header/footer loading, all host rewrites, and all `/pages/...` routes.

8. **Move low-dependency JavaScript.** Move Firebase configuration, environment configuration, accessibility helpers, cookie consent, and integrations. Update HTML references before moving orchestrators. Run syntax checks and browser smoke tests.

9. **Move feature JavaScript.** Move authentication, games, community, admin, and UI modules into categorized directories. Update script tags, lazy-load paths, and runtime `import()` calls. **High risk:** immediately test sign-in persistence, sign-out, game launch, playtime tracking, and admin authorization.

10. **Move main pages.** Move `subdomains/pages/*` into `apps/main/public/pages/*`. Replace relative component fetches with canonical main-site component URLs. **High risk:** crawl every account, games, legal, info, community, and newsletter page.

11. **Move Netlify Functions only with an explicit bundle boundary.** Move `netlify/functions/` to `services/netlify/functions/`, add the root `[functions] directory = "services/netlify/functions"` setting, preserve or relocate email templates as required by the plugin, and keep `firebase-admin` in root dependencies. Add `@anthropic-ai/sdk` and lock it before validating `ai-chat.js`. **High risk:** run a deploy preview and invoke every endpoint.

12. **Move verified subdomain applications.** Migrate auth, news, portal, admin, developers, education, help, and legal one at a time only after confirming each Netlify site’s UI base directory and publish directory. Test each deployed host independently.

13. **Move games, v2, and offline utilities.** Move the WASM game without changing its public URL. Keep `v2` reference-only and exclude `v2/DEPRECATED.md` from public output. Move the offline game after the main site is stable. **High risk:** test WASM loading, cross-origin isolation headers, service-worker behavior, and offline fallback.

14. **Move tests and tooling.** Move legacy test pages out of production publish directories. Update tooling filesystem paths. Add path-integrity checks that fail on missing scripts, stylesheets, components, images, redirects, or Firebase configuration.

15. **Reconcile package manifests.** Keep Firebase dependencies in `services/firebase/functions/package.json`, retain Netlify-bundled dependencies in the root `package.json`, resolve version mismatches, add `@anthropic-ai/sdk`, and stop tracking generated `functions/node_modules`.

16. **Update the service worker and cache policy.** Regenerate precache paths, increment the cache version, verify old caches are invalidated, and confirm new assets load correctly.

17. **Run final validation.**

    - `netlify dev`
    - HTML/link/path crawl
    - JavaScript syntax validation
    - Functions lint
    - Firebase rules deployment validation
    - Auth and Firestore smoke tests
    - WASM game test
    - Lighthouse/performance checks
    - Netlify deploy preview

18. **Deploy incrementally.** Deploy configuration and infrastructure first, the main site second, low-risk subdomains next, and auth, news, admin, and developer surfaces last. Keep rollback copies of root Netlify/Firebase configuration until production verification completes.
