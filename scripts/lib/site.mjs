/**
 * GlitchRealm — single source of truth for public URLs and page metadata.
 *
 * Everything that has to agree about a page lives here: its canonical URL, the
 * file that renders it, its title/description, and whether crawlers may index
 * it. The sitemap, llms.txt, structured data, canonical/OG tags, robots rules
 * and the build guards all read from this module so they can never drift.
 */

export const ORIGIN = 'https://glitchrealm.ca';
export const LEGAL_ORIGIN = 'https://legal.glitchrealm.ca';
export const SITE_NAME = 'GlitchRealm';
export const ORG_NAME = 'InfinityByte Studios';
export const OG_IMAGE = `${ORIGIN}/assets/social/og-glitchrealm.png`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Public pages on the main domain, in sitemap priority order. */
export const PUBLIC_PAGES = [
  {
    path: '/',
    source: 'index.html',
    title: 'GlitchRealm - Cyberpunk Browser Gaming Platform | Play Free Indie Games',
    description:
      'Play free cyberpunk browser games on GlitchRealm. Discover indie HTML5 games, community submissions and original titles — no downloads, no installs.',
    changefreq: 'daily',
    priority: '1.0',
  },
  {
    path: '/games',
    source: 'subdomains/pages/games/games.html',
    title: 'Games Library - Play Free Cyberpunk Browser Games | GlitchRealm',
    description:
      'Browse the full GlitchRealm games library: original cyberpunk titles and community-made HTML5 games you can play free in your browser.',
    changefreq: 'daily',
    priority: '0.9',
  },
  {
    path: '/about',
    source: 'subdomains/pages/info/about.html',
    title: 'About GlitchRealm - Indie Cyberpunk Game Platform',
    description:
      'Learn about GlitchRealm, a cyberpunk-themed indie gaming platform built for players and creators, and the studio behind it.',
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    path: '/community',
    source: 'subdomains/pages/community/community.html',
    title: 'Community - GlitchRealm',
    description:
      'Join the GlitchRealm community. Share posts, discuss games and connect with fellow indie game players and creators.',
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    path: '/newsletter',
    source: 'subdomains/pages/newsletter/newsletter.html',
    title: 'Newsletter - GlitchRealm',
    description:
      'Subscribe to the GlitchRealm newsletter for game releases, community events and platform updates.',
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: '/contact',
    source: 'subdomains/pages/info/contact.html',
    title: 'Contact GlitchRealm',
    description:
      'Get in touch with the GlitchRealm team for support, partnerships, press inquiries or general feedback.',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/support',
    source: 'subdomains/pages/info/support.html',
    title: 'Support & Help Center - GlitchRealm',
    description:
      'GlitchRealm help center: account support, game and platform troubleshooting, developer resources and frequently asked questions.',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/donate',
    source: 'subdomains/pages/info/donate.html',
    title: 'Support GlitchRealm - Donate',
    description:
      'Support GlitchRealm and help keep free cyberpunk browser games online for everyone.',
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    path: '/credits',
    source: 'subdomains/pages/info/credits.html',
    title: 'Credits - GlitchRealm',
    description:
      'Credits and attributions for GlitchRealm: the team, the artists and the open-source technologies behind the platform.',
    changefreq: 'monthly',
    priority: '0.4',
  },
  {
    path: '/our-goal',
    source: 'subdomains/pages/info/our-goal.html',
    title: 'Our Goal - GlitchRealm',
    description:
      'Why GlitchRealm exists: a free, creator-first home for indie browser games.',
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: '/projects',
    source: 'subdomains/pages/info/projects.html',
    title: 'Projects - GlitchRealm',
    description:
      'Games and projects built by InfinityByte Studios and the GlitchRealm community.',
    changefreq: 'monthly',
    priority: '0.5',
  },
];

/**
 * Legal documents. They are served from the legal subdomain and mirrored on the
 * main domain for old links; both copies canonicalise to the legal URL.
 */
const LEGAL_DOCS = [
  ['terms-of-service', 'Terms of Service', 'The terms that govern your use of GlitchRealm, its games and its community features.'],
  ['privacy-policy', 'Privacy Policy', 'How GlitchRealm collects, uses and protects your personal data, and the choices you have.'],
  ['cookie-policy', 'Cookie & Tracking Policy', 'How GlitchRealm uses cookies and similar technologies, and how to manage them.'],
  ['eula', 'End User License Agreement (EULA)', 'Your rights and restrictions when playing games on GlitchRealm.'],
  ['dpa', 'Data Processing Addendum (DPA)', 'The data processing terms that apply to developers and partners who use GlitchRealm.'],
  ['coppa', "Children's Privacy & COPPA Notice", "How GlitchRealm handles children's privacy and complies with COPPA."],
  ['accessibility-statement', 'Accessibility Statement', 'GlitchRealm\'s accessibility commitments, standards and how to report a barrier.'],
  ['developer-agreement', 'Developer Agreement', 'Submission rules, licensing and revenue terms for game developers on GlitchRealm.'],
  ['submission-policy', 'Submission & Review Policy', 'What GlitchRealm accepts, how games are reviewed, and the reasons a submission can be declined.'],
  ['moderation-policy', 'Content Moderation Policy', 'How GlitchRealm moderates games, posts and comments, and how to appeal a decision.'],
  ['copyright-dmca', 'DMCA & Copyright Policy', 'How to submit a copyright takedown notice or counter-notice to GlitchRealm.'],
  ['ip-notice', 'IP & Trademark Notice', 'GlitchRealm\'s intellectual property, trademark and branding rules.'],
  ['brand-protection', 'Brand Protection Notice', 'Rules for referencing the GlitchRealm name, logo and brand assets.'],
  ['refund-policy', 'Refund Policy', 'When donations and paid features can be refunded on GlitchRealm.'],
  ['donation-policy', 'Donation Policy', 'How donations to GlitchRealm are processed, used and acknowledged.'],
  ['code-of-conduct', 'Code of Conduct', 'The behaviour expected from everyone in the GlitchRealm community.'],
  ['external-platforms', 'External Platforms', 'Third-party services GlitchRealm links to and the terms that apply when you use them.'],
  ['legal-definitions', 'Legal Definitions', 'Definitions for the terms used across GlitchRealm\'s legal documents.'],
  ['legal-contact', 'Legal Contact Information', 'Contact GlitchRealm for legal matters, DMCA notices and privacy requests.'],
  ['legal-information', 'Legal Information', 'Index of GlitchRealm legal documents, policies and reporting routes.'],
];

export const LEGAL_PAGES = LEGAL_DOCS.map(([name, title, description]) => ({
  path: `/${name}`,
  source: `subdomains/pages/legal/${name}.html`,
  title: `${title} - GlitchRealm`,
  description,
  origin: 'legal',
  changefreq: 'yearly',
  priority: '0.3',
  kind: 'legal',
}));

export const LEGAL_INDEX = {
  path: '/',
  source: 'subdomains/legal/index.html',
  title: 'Legal Center - GlitchRealm',
  description:
    'Every GlitchRealm policy in one place: terms, privacy, cookies, developer and moderation policies.',
  origin: 'legal',
  changefreq: 'monthly',
  priority: '0.5',
  kind: 'legal',
};

/** Pages that must never be indexed, matched against the public URL. */
export const NOINDEX_PATHS = [
  '/404',
  '/blank',
  '/offline',
  '/maintenance',
  '/admin-console',
  '/admin-panel',
  '/admin-status',
  '/admin-verify-writer',
  '/auth-bridge',
  '/auth-bridge-template',
  '/user-portal',
  '/settings',
  '/developer-dashboard',
  '/moderation',
  '/theme-scheduler',
  '/newsletter-modal',
  '/newsletter-success',
  '/thank-you',
  '/leaderboards',
  '/reviews',
  '/ads',
  '/game-detail',
  '/06a965f6ee081157c87d0ad51dcc734e',
  '/google45e7c06578ec8df3',
  '/dist',
];

export const NOINDEX_PREFIXES = ['/admin', '/auth-bridge', '/subdomains/'];

export function absoluteUrl(page) {
  const base = page.origin === 'legal' ? LEGAL_ORIGIN : ORIGIN;
  return page.path === '/' ? `${base}/` : `${base}${page.path}`;
}

export function isNoindexPath(urlPath) {
  if (NOINDEX_PREFIXES.some((prefix) => urlPath.startsWith(prefix))) return true;
  return NOINDEX_PATHS.some((item) => urlPath === item || urlPath === `${item}.html`);
}

/** All indexable pages: main-domain pages plus legal documents. */
export function sitemapPages() {
  return [...PUBLIC_PAGES, ...LEGAL_PAGES];
}

/** JSON-LD Organisation + WebSite nodes shared by every page. */
export function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': `${ORIGIN}/#organization`,
    name: ORG_NAME,
    url: `${ORIGIN}/`,
    logo: `${ORIGIN}/assets/Favicon%20and%20Icons/favicon-96x96.png`,
    sameAs: [
      'https://github.com/InfinityByteStudios',
    ],
  };
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': `${ORIGIN}/#website`,
    url: `${ORIGIN}/`,
    name: SITE_NAME,
    description: 'Free cyberpunk and indie browser games.',
    publisher: { '@id': `${ORIGIN}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${ORIGIN}/games?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbNode(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
