// Netlify Function to serve RSS feed for GlitchRealm News
// This proxies to the Firebase Cloud Function for now
// Alternative: Can query Firestore directly with Firebase Admin SDK if env vars are configured

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=600, s-maxage=1200',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Fetch from Firebase Cloud Function
    const response = await fetch('https://us-central1-shared-sign-in.cloudfunctions.net/newsFeed');
    
    if (!response.ok) {
      throw new Error(`Firebase function returned ${response.status}`);
    }
    
    const rssXml = await response.text();

    return {
      statusCode: 200,
      headers,
      body: rssXml
    };
  } catch (error) {
    console.error('[feed.rss] Error fetching RSS feed:', error);
    
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

