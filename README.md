<div align="center">

# GlitchRealm

### A Cyberpunk Browser Gaming Platform

[![Live Site](https://img.shields.io/badge/Live-glitchrealm.ca-00fff9?style=for-the-badge&logo=netlify&logoColor=white)](https://glitchrealm.ca)
[![License: MIT](https://img.shields.io/badge/Code-MIT-blue?style=flat-square)](LICENSE)
[![Assets: ARR](https://img.shields.io/badge/Assets-All%20Rights%20Reserved-red?style=flat-square)](LICENSE-ASSETS)
[![Firebase](https://img.shields.io/badge/Firebase-10.7.1-FFCA28?style=flat-square&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![Netlify Status](https://img.shields.io/badge/Deployed%20on-Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://glitchrealm.ca)

**Discover, play, and track HTML5 games — all in one place.**
**PLEASE NOT ALL SIGN IN BUTTONS DO NOT WORK DUE TO ISSUES MOST HAVE BEEN REMOVED**

[Explore Games](https://glitchrealm.ca/games.html) · [Submit Your Game](https://glitchrealm.ca/submit-game.html) · [Join the Community](https://glitchrealm.ca/community.html) · [Report a Bug](https://github.com/InfinityByteStudios/GlitchRealm/issues)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Game Integration](#game-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

GlitchRealm is a browser-based gaming platform with a distinctive cyberpunk aesthetic. It provides a unified hub for discovering and playing HTML5 games with built-in user accounts, playtime tracking, community features, and a developer submission pipeline.

**Why GlitchRealm exists:** Browser gaming is fragmented. Players find games scattered across dozens of sites with no unified identity, no progress tracking, and no community. GlitchRealm brings everything together — a single platform where players track their gaming journey and developers reach an engaged audience.

### Design Principles

| Principle | Approach |
|-----------|----------|
| **Zero build complexity** | Pure HTML, CSS, and ES6+ JavaScript — no bundlers, no transpilers |
| **Serverless-first** | Firebase Authentication, Cloud Firestore, and Netlify edge delivery |
| **Progressive enhancement** | Core content works without JS; interactivity layers on top |
| **Security by default** | Comprehensive Firestore rules with multi-tier validation |

---

## Features

### Players
- **Curated Game Library** — browse and play HTML5 games directly in the browser
- **Unified Accounts** — sign up with email, Google, or GitHub
- **Playtime Tracking** — automatic session tracking across every game
- **Custom Avatars** — profile images powered by Supabase Storage
- **Reviews & Ratings** — rate games and read community feedback
- **Community Hub** — discussions, news articles, and platform updates
- **PWA Support** — install GlitchRealm as a desktop or mobile app

### Developers
- **Game Submission Portal** — guided multi-step form for submitting HTML5 games
- **Developer Dashboard** — analytics for plays, reviews, and engagement
- **Verification Badges** — earn a verified creator badge
- **Playtime SDK** — lightweight tracker to integrate into external games
- **Moderation Tools** — manage submissions and community content

### Platform
- **Responsive Design** — optimized for desktop, tablet, and mobile
- **Accessibility** — keyboard navigation and screen reader support
- **Performance** — lazy loading, CDN delivery, and aggressive caching
- **Offline Support** — service worker for offline fallback pages

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, ES6+ JavaScript (no framework) |
| **Auth** | Firebase Authentication v10.7.1 |
| **Database** | Cloud Firestore |
| **File Storage** | Supabase Storage |
| **Hosting** | Netlify (CDN + Edge Functions) |
| **Backend** | Firebase Cloud Functions (Node.js 20) |

### Key Patterns

**Global Firebase Services** — All Firebase SDK modules are initialized in `firebase-core.js` and exposed on the `window` object (`window.firebaseAuth`, `window.firebaseFirestore`, etc.) for cross-page access without a bundler.

**Zero Build Pipeline** — ES6 modules are imported directly from the Firebase CDN via `<script type="module">` tags. Netlify handles minification, compression, and cache headers in production.

**Firestore Data Model**

```
game_submissions/             # Community-submitted games
verified_users/               # Verified creator records
playtime/{userId}/games/      # Per-user, per-game session data
reviews/                      # Game reviews with moderation flags
community_posts/              # Discussion threads
news_articles/                # Platform announcements
```

Security rules enforce a three-tier update model (owner, owner-content-only, admin) with validators that check the final merged document state. See `config/firestore.rules` for details.

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Web browser | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| Git | 2.x+ |
| Node.js | 18+ (development only) |
| Netlify CLI | Latest (development only) |

### Local Development

```bash
# Clone the repository
git clone https://github.com/InfinityByteStudios/GlitchRealm.git
cd GlitchRealm

# Serve locally with Netlify Dev (recommended — handles redirects and functions)
npm install -g netlify-cli
netlify dev
```

The site will be available at `http://localhost:8888`.

**Alternative:** Use any static file server (e.g., `npx http-server`, Python's `http.server`, or VS Code Live Server), though Netlify-specific features like redirects and edge functions won't work.

### Submitting a Game

1. Create an account at [glitchrealm.ca](https://glitchrealm.ca)
2. Navigate to **Submit a Game**
3. Complete the multi-step form — basic info, extended details, and media
4. Submit for review and track status on your **Developer Dashboard**

**Requirements:**
- HTML5-based (hosted externally or self-contained)
- Cover image required (16:9 aspect ratio recommended)
- Must comply with the [Code of Conduct](https://glitchrealm.ca/code-of-conduct.html)

---

## Project Structure

```
├── assets/                    # Static assets (images, icons, fonts)
├── components/                # Reusable HTML partials (header, footer)
├── config/                    # Firebase rules, Lighthouse budgets
├── css/                       # Stylesheets
│   └── styles.css             #   Global cyberpunk theme & CSS variables
├── docs/                      # Internal documentation
├── functions/                 # Firebase Cloud Functions (Node.js 20)
├── js/                        # Page-specific JavaScript modules
├── netlify/                   # Netlify serverless functions
├── subdomains/                # Subdomain content (developers, legal, etc.)
├── supabase/                  # Supabase SQL migration scripts
├── utilities/                 # Shared utility scripts
├── firebase-core.js           # Centralized Firebase initialization
├── netlify.toml               # Deployment & build configuration
├── index.html                 # Landing page
└── README.md
```

### Key Files

| File | Description |
|------|-------------|
| `firebase-core.js` | Initializes Firebase and exposes services globally |
| `config/firestore.rules` | Firestore security rules |
| `js/game-launcher.js` | Game window management and playtime events |
| `js/game-playtime-tracker.js` | Playtime tracking SDK for game developers |
| `css/styles.css` | Global theme with CSS custom properties |
| `netlify.toml` | Netlify build settings, headers, and redirects |

### CSS Theme

The cyberpunk visual identity is driven by CSS custom properties:

```css
:root {
  --primary-cyan: #00fff9;
  --primary-magenta: #ff0080;
  --dark-bg: #0a0a0a;
  --success: #00ff41;
}
```

Key utility classes: `.glitch` (animated text effect), `.neural-button` (primary CTA), `.step-indicator` (multi-step forms).

---

## Game Integration

Integrate playtime tracking into your game with a single script import:

```html
<script type="module">
  import { trackPlaytime } from 'https://glitchrealm.ca/game-playtime-tracker.js';

  const user = window.firebaseAuth?.currentUser;
  if (user) {
    trackPlaytime('your-game-id', user.uid);
  }
</script>
```

**Hosting options:**
- **External** — host your game anywhere and link it via the submission form
- **On-platform** — place your game in a `/Games/YourGame/` folder with an `index.html` entry point

---

## Deployment

GlitchRealm is deployed on **Netlify** with automatic deploys from the `main` branch.

```bash
# Manual deploy
netlify deploy --prod

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions
```

### Required Environment Variables (Netlify Dashboard)

| Variable | Purpose |
|----------|---------|
| `FIREBASE_API_KEY` | Firebase project API key |
| `FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## Contributing

Contributions are welcome. Please read the [Code of Conduct](docs/CODE_OF_CONDUCT.md) before participating.

1. **Fork** the repository
2. **Create a branch:** `git checkout -b feature/your-feature`
3. **Commit your changes:** `git commit -m 'Add your feature'`
4. **Push:** `git push origin feature/your-feature`
5. **Open a Pull Request**

### Guidelines

- Keep the zero-build philosophy — no bundlers or transpilers
- Use the global Firebase pattern (`window.firebaseAuth`, etc.)
- Always include required Firestore fields when updating documents
- Test across Chrome, Firefox, Safari, and Edge
- Follow existing CSS variables and class naming conventions

---

## License

This project uses a **dual license**:

| Scope | License | Details |
|-------|---------|---------|
| Source code | [MIT](LICENSE) | Free to use, modify, and distribute |
| Non-code assets | [All Rights Reserved](LICENSE-ASSETS) | Logos, images, brand elements, game art |

"GlitchRealm" and "GlitchRealm Games" are trademarks of GlitchRealm Games. See [NOTICE](NOTICE) for details.

---

## Contact

| | |
|---|---|
| **Website** | [glitchrealm.ca](https://glitchrealm.ca) |
| **General Inquiries** | [contact@glitchrealm.ca](mailto:contact@glitchrealm.ca) |
| **Developer Support** | [developers@glitchrealm.ca](mailto:developers@glitchrealm.ca) |
| **Security Reports** | [security@glitchrealm.ca](mailto:security@glitchrealm.ca) |
| **Legal** | [legal@glitchrealm.ca](mailto:legal@glitchrealm.ca) |
| **Bug Reports** | [GitHub Issues](https://github.com/InfinityByteStudios/GlitchRealm/issues) |

---

<div align="center">

**Built by the GlitchRealm team** · [glitchrealm.ca](https://glitchrealm.ca)

</div>
