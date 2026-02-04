/**
 * Sitemap Generator for GlitchRealm
 * 
 * This script generates a dynamic sitemap.xml including all game detail pages.
 * Should be run periodically or triggered after game submissions.
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin (use service account in production)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'shared-sign-in'
  });
}

const db = admin.firestore();

async function generateSitemap() {
  const baseUrl = 'https://glitchrealm.ca';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Static pages with priority and change frequency
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' }, // Homepage
    { url: '/games.html', priority: '0.9', changefreq: 'daily' },
    { url: '/community.html', priority: '0.8', changefreq: 'weekly' },
    { url: '/about.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/submit-game.html', priority: '0.8', changefreq: 'monthly' },
    { url: '/news.html', priority: '0.7', changefreq: 'weekly' },
    { url: '/legal.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/privacy-policy.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/terms-of-service.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/cookie-policy.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/contact.html', priority: '0.6', changefreq: 'monthly' },
    { url: '/donate.html', priority: '0.6', changefreq: 'monthly' },
    { url: '/credits.html', priority: '0.5', changefreq: 'monthly' }
  ];
  
  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // Add static pages
  staticPages.forEach(page => {
    sitemapContent += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  try {
    // Fetch all published game submissions
    const gamesSnapshot = await db.collection('game_submissions')
      .where('status', '==', 'published')
      .get();
    
    console.log(`Found ${gamesSnapshot.size} published games`);
    
    // Add dynamic game detail pages
    gamesSnapshot.forEach(doc => {
      const game = doc.data();
      const gameId = doc.id;
      
      sitemapContent += `  <url>
    <loc>${baseUrl}/game-detail.html?id=${gameId}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;
      
      // Add image sitemap data if cover image exists
      if (game.coverImageUrl) {
        sitemapContent += `
    <image:image>
      <image:loc>${escapeXml(game.coverImageUrl)}</image:loc>
      <image:title>${escapeXml(game.title || 'Untitled Game')}</image:title>
      <image:caption>${escapeXml(game.description || '')}</image:caption>
    </image:image>`;
      }
      
      sitemapContent += `
  </url>
`;
    });

    // Close sitemap
    sitemapContent += `</urlset>`;
    
    // Write to file
    fs.writeFileSync('sitemap.xml', sitemapContent, 'utf8');
    console.log('Sitemap generated successfully!');
    console.log(`Total URLs: ${staticPages.length + gamesSnapshot.size}`);
    
    return sitemapContent;
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}

function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Run if executed directly
if (require.main === module) {
  generateSitemap()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed:', err);
      process.exit(1);
    });
}

module.exports = { generateSitemap };
