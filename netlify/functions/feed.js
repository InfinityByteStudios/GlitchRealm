// Netlify Function to serve RSS feed for GlitchRealm News
// Queries Firestore directly - no expensive Cloud Functions!

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (only once)
let db;
try {
  if (!db) {
    const serviceAccount = {
      projectId: "shared-sign-in",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };
    
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: "shared-sign-in"
    });
    db = getFirestore(app);
  }
} catch (e) {
  console.error('[feed.rss] Firebase init failed:', e);
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=600, s-maxage=1200',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    if (!db) throw new Error('Firestore not initialized');
    
    // Query published articles directly from Firestore
    const snapshot = await db.collection('news_articles')
      .where('draft', '==', false)
      .orderBy('publishedAt', 'desc')
      .limit(50)
      .get();
    
    const articles = [];
    snapshot.forEach(doc => {
      articles.push({ id: doc.id, ...doc.data() });
    });
    
    // Helper to escape XML special characters
    const escapeXml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    // Helper to format date as RFC 822
    const formatDate = (timestamp) => {
      if (!timestamp) return new Date().toUTCString();
      try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toUTCString();
      } catch (e) {
        return new Date().toUTCString();
      }
    };
    
    // Build RSS XML
    const baseUrl = 'https://news.glitchrealm.ca';
    const buildDate = new Date().toUTCString();
    
    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>GlitchRealm News</title>
    <link>${baseUrl}/</link>
    <description>Latest news, updates, and articles from the GlitchRealm cyberpunk gaming platform</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.rss" rel="self" type="application/rss+xml" />
`;

    articles.forEach(article => {
      const title = escapeXml(article.title || 'Untitled');
      const link = `${baseUrl}/article.html?id=${article.id}`;
      const description = escapeXml(article.excerpt || article.description || '');
      const content = escapeXml(article.content || '');
      const pubDate = formatDate(article.publishedAt);
      const author = escapeXml(article.authorName || 'GlitchRealm Team');
      
      rss += `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      <pubDate>${pubDate}</pubDate>
      <author>${author}</author>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
    });

    rss += `
  </channel>
</rss>`;

    return {
      statusCode: 200,
      headers,
      body: rss
    };
  } catch (error) {
    console.error('[feed.rss] Error generating RSS feed:', error);
    
    // Fallback: return basic RSS structure
    const baseUrl = 'https://news.glitchrealm.ca';
    const buildDate = new Date().toUTCString();
    
    const fallbackRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GlitchRealm News</title>
    <link>${baseUrl}/</link>
    <description>Latest news, updates, and articles from the GlitchRealm cyberpunk gaming platform</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.rss" rel="self" type="application/rss+xml" />
  </channel>
</rss>`;

    return {
      statusCode: 200,
      headers,
      body: fallbackRss
    };
  }
};

