#!/usr/bin/env node

/**
 * Pre-Deployment Validation Script
 * Checks all SEO and AdSense requirements before deployment
 */

const fs = require('fs');
const path = require('path');


const errors = [];
const warnings = [];
const success = [];

// Check 1: Verify critical files exist
const criticalFiles = [
  'index.html',
  'subdomains/pages/games/game-detail.html',
  'subdomains/pages/games/games.html',
  'components/footer.html',
  'robots.txt',
  'netlify.toml',
  'scripts/build-content.mjs',
  'scripts/lib/site.mjs',
  'scripts/lib/games.mjs',
  'scripts/generate-prerendered-content.js',
  'scripts/generate-sitemap.mjs',
  'sitemap.xml',
  'subdomains/pages/legal/privacy-policy.html',
  'subdomains/pages/legal/terms-of-service.html'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    success.push(`✅ ${file} exists`);
  } else {
    errors.push(`❌ Missing critical file: ${file}`);
  }
});

// Check 2: Validate game-detail.html has semantic structure
try {
  const gameDetailContent = fs.readFileSync('subdomains/pages/games/game-detail.html', 'utf8');
  
  // Check for article tag
  if (gameDetailContent.includes('<article')) {
    success.push('✅ game-detail.html uses <article> tag');
  } else {
    errors.push('❌ game-detail.html missing <article> tag');
  }
  
  // Check for schema.org microdata
  if (gameDetailContent.includes('itemscope') && gameDetailContent.includes('VideoGame')) {
    success.push('✅ Schema.org microdata present');
  } else {
    warnings.push('⚠️  Schema.org microdata may be missing');
  }
  
  // Check for breadcrumb navigation
  if (gameDetailContent.includes('Breadcrumb') && gameDetailContent.includes('breadcrumbGame')) {
    success.push('✅ Breadcrumb navigation implemented');
  } else {
    warnings.push('⚠️  Breadcrumb navigation may be missing');
  }
  
  // Check for AdSense containers
  const adsenseContainers = ['adsense-top-cta', 'adsense-mid-content', 'adsense-bottom'];
  adsenseContainers.forEach(container => {
    if (gameDetailContent.includes(`id="${container}"`)) {
      success.push(`✅ AdSense container: ${container}`);
    } else {
      warnings.push(`⚠️  AdSense container missing: ${container}`);
    }
  });
  
  // Check for meta tag functions
  if (gameDetailContent.includes('updateMetaTag') && gameDetailContent.includes('addStructuredData')) {
    success.push('✅ Dynamic meta tag functions present');
  } else {
    errors.push('❌ Meta tag update functions missing');
  }
  
} catch (err) {
  errors.push(`❌ Error reading game-detail.html: ${err.message}`);
}

// Check 3: Validate index.html has proper meta tags
try {
  const indexContent = fs.readFileSync('index.html', 'utf8');
  
  const requiredMetaTags = [
    'og:title',
    'og:description',
    'og:image',
    'twitter:card',
    'description',
    'canonical'
  ];
  
  requiredMetaTags.forEach(tag => {
    if (indexContent.includes(tag)) {
      success.push(`✅ Homepage has ${tag} meta tag`);
    } else {
      warnings.push(`⚠️  Homepage missing ${tag} meta tag`);
    }
  });
  
} catch (err) {
  errors.push(`❌ Error reading index.html: ${err.message}`);
}

// Check 4: Validate robots.txt
try {
  const robotsContent = fs.readFileSync('robots.txt', 'utf8');
  
  if (robotsContent.includes('User-agent: *')) {
    success.push('✅ robots.txt has User-agent directive');
  } else {
    errors.push('❌ robots.txt missing User-agent directive');
  }
  
  if (robotsContent.includes('Sitemap:')) {
    success.push('✅ robots.txt declares sitemap location');
  } else {
    warnings.push('⚠️  robots.txt should include Sitemap directive');
  }
  
  if (robotsContent.includes('Mediapartners-Google')) {
    success.push('✅ robots.txt allows AdSense bot');
  } else {
    warnings.push('⚠️  Consider allowing Mediapartners-Google for AdSense');
  }
  
} catch (err) {
  errors.push(`❌ Error reading robots.txt: ${err.message}`);
}

// Check 5: Validate the build-time content bakery
try {
  const bakery = fs.readFileSync('scripts/build-content.mjs', 'utf8');

  if (bakery.includes('export async function bakeContent')) {
    success.push('✅ Content bakery exports bakeContent()');
  } else {
    errors.push('❌ scripts/build-content.mjs missing bakeContent()');
  }

  if (bakery.includes('gameJsonLd')) {
    success.push('✅ Static game pages add VideoGame JSON-LD');
  } else {
    warnings.push('⚠️  Static game pages should add VideoGame JSON-LD');
  }

  if (bakery.includes('window.__GAME_DETAIL_STATIC__')) {
    success.push('✅ Static game pages hydrate from baked data');
  } else {
    warnings.push('⚠️  Static game pages should hydrate from baked data');
  }
} catch (err) {
  errors.push(`❌ Error reading scripts/build-content.mjs: ${err.message}`);
}

// Check 5b: Validate the built HTML (crawler-visible, JS off)
try {
  const indexContent = fs.readFileSync('dist/index.html', 'utf8');
  const newestInfo = /<div class="featured-info" id="newest-game-info">([\s\S]*?)<\/div>/.exec(indexContent);
  if (newestInfo && /<h3>[^<]+<\/h3>/.test(newestInfo[1]) && !newestInfo[1].includes('Loading...')) {
    success.push('✅ Homepage ships a server-rendered "Newest Game" card');
  } else {
    errors.push('❌ Homepage "Newest Game" card has no server-rendered content');
  }

  if (/href="\/games\/[a-z0-9-]+\/"/.test(indexContent)) {
    success.push('✅ Homepage links to the newest game static page');
  } else {
    errors.push('❌ Homepage does not link to the newest game static page');
  }

  const gamesContent = fs.readFileSync('dist/games.html', 'utf8');
  const bakedCards = (gamesContent.match(/class="game-card/g) || []).length;
  if (bakedCards > 5) {
    success.push(`✅ Games page ships ${bakedCards} server-rendered game cards`);
  } else {
    errors.push('❌ Games page has no server-rendered game cards');
  }
  const gameLinks = (gamesContent.match(/href="\/games\/[a-z0-9-]+\/"/g) || []).length;
  if (gameLinks > 0) {
    success.push(`✅ Games page links to ${gameLinks} static game pages`);
  } else {
    errors.push('❌ Games page does not link to static game pages');
  }

  const gameDetailContent = fs.readFileSync('subdomains/pages/games/game-detail.html', 'utf8');
  if (gameDetailContent.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) {
    success.push('✅ Game detail page loads adsbygoogle.js');
  } else {
    errors.push('❌ Game detail page does not load adsbygoogle.js');
  }

  const adUnits = (gameDetailContent.match(/class="adsbygoogle"/g) || []).length;
  if (adUnits >= 3) {
    success.push(`✅ Game detail page has ${adUnits} AdSense units`);
  } else {
    errors.push('❌ Game detail page is missing AdSense units');
  }

  const sitemapContent = fs.readFileSync('sitemap.xml', 'utf8');
  const gameUrls = (sitemapContent.match(/<loc>https:\/\/glitchrealm\.ca\/games\/[a-z0-9-]+\/<\/loc>/g) || []).length;
  if (gameUrls > 0) {
    success.push(`✅ sitemap.xml lists ${gameUrls} static game URLs`);
  } else {
    errors.push('❌ sitemap.xml lists no game URLs');
  }
} catch (err) {
  errors.push(`❌ Error validating built content: ${err.message}`);
}

// Check 6: Validate footer exists and has legal links
try {
  const footerContent = fs.readFileSync('components/footer.html', 'utf8');
  
  const requiredLinks = [
    ['privacy-policy', 'privacy-policy.html'],
    ['terms-of-service', 'terms-of-service.html'],
    ['contact', 'contact.html'],
  ];

  for (const [pretty, legacy] of requiredLinks) {
    if (footerContent.includes(`/${pretty}"`) || footerContent.includes(`${pretty}.html`)) {
      success.push(`✅ Footer has link to ${pretty}`);
    } else {
      warnings.push(`⚠️  Footer should link to ${legacy}`);
    }
  }
  
  // Check for email addresses
  if (footerContent.includes('@glitchrealm.ca')) {
    success.push('✅ Footer has contact email');
  } else {
    warnings.push('⚠️  Footer should include contact email');
  }
  
} catch (err) {
  errors.push(`❌ Error reading footer.html: ${err.message}`);
}

// Check 7: Validate Netlify configuration
try {
  const netlifyContent = fs.readFileSync('netlify.toml', 'utf8');
  
  if (netlifyContent.includes('[build.processing]')) {
    success.push('✅ Netlify has build processing enabled');
  } else {
    warnings.push('⚠️  Consider enabling Netlify build processing for optimization');
  }
  
  if (netlifyContent.includes('minify')) {
    success.push('✅ Netlify minification enabled');
  } else {
    warnings.push('⚠️  Enable minification for better performance');
  }
  
  if (netlifyContent.includes('@netlify/plugin-sitemap')) {
    success.push('✅ Sitemap plugin configured');
  } else {
    warnings.push('⚠️  Consider adding @netlify/plugin-sitemap');
  }
  
} catch (err) {
  errors.push(`❌ Error reading netlify.toml: ${err.message}`);
}

// Print Results

if (success.length > 0) {
  success.forEach(s => console.log(s));
}

if (warnings.length > 0) {
  warnings.forEach(w => console.log(w));
}

if (errors.length > 0) {
  errors.forEach(e => console.log(e));
}


// Determine overall status
if (errors.length > 0) {
  process.exit(1);
} else if (warnings.length > 0) {
  process.exit(0);
} else {
  process.exit(0);
}
