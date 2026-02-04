/**
 * Netlify Edge Function for Prerendering Game Detail Pages
 * This function intercepts requests to game-detail.html and injects
 * game data directly into the HTML for SEO/crawler compliance.
 */

import { getStore } from "@netlify/blobs";

export default async (request, context) => {
  const url = new URL(request.url);
  
  // Only handle game-detail.html requests
  if (!url.pathname.includes('game-detail.html')) {
    return;
  }

  // Extract game ID from query params
  const gameId = url.searchParams.get('id');
  if (!gameId) {
    return; // Let the original page handle the "no ID" case
  }

  try {
    // Fetch game data from Firestore via REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/shared-sign-in/databases/(default)/documents/game_submissions/${gameId}`;
    const firestoreResponse = await fetch(firestoreUrl);
    
    if (!firestoreResponse.ok) {
      console.log(`Game ${gameId} not found in Firestore`);
      return; // Let the original page handle not found
    }

    const firestoreData = await firestoreResponse.json();
    
    // Extract Firestore fields (Firestore REST API format)
    const game = {
      title: firestoreData.fields?.title?.stringValue || 'Untitled Game',
      description: firestoreData.fields?.description?.stringValue || 'No description available.',
      extendedDescription: firestoreData.fields?.extendedDescription?.stringValue || '',
      howToPlay: firestoreData.fields?.howToPlay?.stringValue || '',
      coverImageUrl: firestoreData.fields?.coverImageUrl?.stringValue || '',
      playUrl: firestoreData.fields?.playUrl?.stringValue || '',
      tags: firestoreData.fields?.tags?.arrayValue?.values?.map(v => v.stringValue) || [],
      badge: firestoreData.fields?.badge?.stringValue || '',
      status: firestoreData.fields?.status?.stringValue || 'draft'
    };

    // Fetch the original HTML
    const htmlResponse = await context.next();
    let html = await htmlResponse.text();

    // Inject meta tags
    const metaTags = `
    <title>${escapeHtml(game.title)} - GlitchRealm</title>
    <meta name="description" content="${escapeHtml(game.description)}">
    <meta property="og:title" content="${escapeHtml(game.title)}">
    <meta property="og:description" content="${escapeHtml(game.description)}">
    <meta property="og:image" content="${escapeHtml(game.coverImageUrl || 'https://glitchrealm.ca/assets/Favicon%20and%20Icons/apple-touch-icon.png')}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://glitchrealm.ca/game-detail.html?id=${gameId}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(game.title)}">
    <meta name="twitter:description" content="${escapeHtml(game.description)}">
    <meta name="twitter:image" content="${escapeHtml(game.coverImageUrl || 'https://glitchrealm.ca/assets/Favicon%20and%20Icons/apple-touch-icon.png')}">`;
    
    html = html.replace('<title>Game Details - GlitchRealm</title>', metaTags);

    // Inject structured data (JSON-LD)
    const structuredData = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": "${escapeHtml(game.title)}",
      "description": "${escapeHtml(game.description)}",
      "image": "${escapeHtml(game.coverImageUrl)}",
      "url": "https://glitchrealm.ca/game-detail.html?id=${gameId}",
      "genre": ${JSON.stringify(game.tags)},
      "gamePlatform": "Web Browser",
      "operatingSystem": "Any"
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://glitchrealm.ca/"
      }, {
        "@type": "ListItem",
        "position": 2,
        "name": "Games",
        "item": "https://glitchrealm.ca/games.html"
      }, {
        "@type": "ListItem",
        "position": 3,
        "name": "${escapeHtml(game.title)}",
        "item": "https://glitchrealm.ca/game-detail.html?id=${gameId}"
      }]
    }
    </script>`;
    
    html = html.replace('</head>', `${structuredData}</head>`);

    // Inject prerendered content (replace loading state with actual content)
    const tagsHtml = game.tags.map(tag => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join('');
    const badgeHtml = game.badge && ['new', 'updated', 'beta'].includes(game.badge) 
      ? `<span class="detail-badge ${game.badge}">${game.badge.toUpperCase()}</span>` 
      : '';
    
    const prerenderedContent = `
    <article id="gameContent" style="display:block;">
      <div class="detail-header">
        <div class="detail-cover">
          <img id="gameCover" src="${escapeHtml(game.coverImageUrl || 'assets/game logos/ByteSurge.webp')}" alt="${escapeHtml(game.title)} Cover" width="560" height="315" loading="eager">
        </div>
        
        <div class="detail-info">
          <h1 id="gameTitle">${escapeHtml(game.title)}</h1>
          
          <div class="detail-meta">
            ${badgeHtml}
            <span id="gameStatus" class="detail-badge">${game.status.toUpperCase()}</span>
          </div>
          
          <div id="gameTags" class="detail-tags">${tagsHtml}</div>
          
          <p id="gameDescription" class="detail-description">${escapeHtml(game.description)}</p>
          
          <div class="action-buttons">
            ${game.playUrl ? `<a id="playButton" href="${escapeHtml(game.playUrl)}" target="_blank" class="play-btn">▶ Play Now</a>` : ''}
          </div>
        </div>
      </div>
      
      ${game.extendedDescription ? `
      <section id="extendedDescSection" class="detail-section">
        <h2>About This Game</h2>
        <div id="extendedDescription">${escapeHtml(game.extendedDescription)}</div>
      </section>` : ''}
      
      ${game.howToPlay ? `
      <section id="howToPlaySection" class="detail-section">
        <h2>How to Play</h2>
        <div id="howToPlay">${escapeHtml(game.howToPlay)}</div>
      </section>` : ''}
    </article>`;

    // Replace loading state with prerendered content
    html = html.replace(
      /<div id="loadingState" class="loading-state">[\s\S]*?<\/div>\s*<div id="notFoundState"[\s\S]*?<\/div>\s*<div id="gameContent" style="display:none;">[\s\S]*?<\/div>/,
      prerenderedContent
    );

    // Hide loading state
    html = html.replace('id="loadingState"', 'id="loadingState" style="display:none;"');

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache for 5-10 minutes
      },
    });

  } catch (error) {
    console.error('Prerender error:', error);
    return; // Fall back to original page
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const config = {
  path: "/game-detail.html"
};
