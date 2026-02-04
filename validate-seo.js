#!/usr/bin/env node

/**
 * Pre-Deployment Validation Script
 * Checks all SEO and AdSense requirements before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 GlitchRealm SEO & AdSense Pre-Deployment Validation\n');

const errors = [];
const warnings = [];
const success = [];

// Check 1: Verify critical files exist
console.log('✓ Checking critical files...');
const criticalFiles = [
  'game-detail.html',
  'index.html',
  'games.html',
  'footer.html',
  'robots.txt',
  'netlify.toml',
  'functions/prerender.js',
  'generate-sitemap.js',
  'privacy-policy.html',
  'terms-of-service.html'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    success.push(`✅ ${file} exists`);
  } else {
    errors.push(`❌ Missing critical file: ${file}`);
  }
});

// Check 2: Validate game-detail.html has semantic structure
console.log('\n✓ Validating semantic HTML structure...');
try {
  const gameDetailContent = fs.readFileSync('game-detail.html', 'utf8');
  
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
console.log('\n✓ Validating homepage meta tags...');
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
console.log('\n✓ Validating robots.txt...');
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

// Check 5: Validate prerender edge function
console.log('\n✓ Validating edge function...');
try {
  const prerenderContent = fs.readFileSync('functions/prerender.js', 'utf8');
  
  if (prerenderContent.includes('export default')) {
    success.push('✅ Edge function exports default handler');
  } else {
    errors.push('❌ Edge function missing default export');
  }
  
  if (prerenderContent.includes('firestore.googleapis.com')) {
    success.push('✅ Edge function fetches from Firestore');
  } else {
    warnings.push('⚠️  Edge function may not be fetching game data');
  }
  
  if (prerenderContent.includes('JSON-LD') || prerenderContent.includes('application/ld+json')) {
    success.push('✅ Edge function adds structured data');
  } else {
    warnings.push('⚠️  Edge function should add JSON-LD structured data');
  }
  
} catch (err) {
  errors.push(`❌ Error reading functions/prerender.js: ${err.message}`);
}

// Check 6: Validate footer exists and has legal links
console.log('\n✓ Validating footer...');
try {
  const footerContent = fs.readFileSync('footer.html', 'utf8');
  
  const requiredLinks = [
    'privacy-policy.html',
    'terms-of-service.html',
    'contact.html'
  ];
  
  requiredLinks.forEach(link => {
    if (footerContent.includes(link)) {
      success.push(`✅ Footer has link to ${link}`);
    } else {
      warnings.push(`⚠️  Footer should link to ${link}`);
    }
  });
  
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
console.log('\n✓ Validating Netlify configuration...');
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
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION RESULTS');
console.log('='.repeat(60) + '\n');

if (success.length > 0) {
  console.log('✅ PASSED CHECKS:');
  success.forEach(s => console.log(`  ${s}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(w => console.log(`  ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS (MUST FIX):');
  errors.forEach(e => console.log(`  ${e}`));
  console.log('');
}

console.log('='.repeat(60));
console.log(`Total: ${success.length} passed, ${warnings.length} warnings, ${errors.length} errors`);
console.log('='.repeat(60) + '\n');

// Determine overall status
if (errors.length > 0) {
  console.log('❌ VALIDATION FAILED - Please fix errors before deploying\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('⚠️  VALIDATION PASSED WITH WARNINGS - Safe to deploy, but consider addressing warnings\n');
  process.exit(0);
} else {
  console.log('✅ VALIDATION PASSED - Ready for deployment!\n');
  process.exit(0);
}
