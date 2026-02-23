/**
 * Example: How to display owner/author usernames on game cards and articles
 * 
 * This file shows example code for updating your display logic to show
 * verified usernames instead of hardcoded studio names.
 */

// ===================================================================
// EXAMPLE 1: Display game owner username on game cards
// ===================================================================

async function renderGameCard(gameData) {
  const card = document.createElement('div');
  card.className = 'game-card';
  
  // Get the owner username
  let ownerName = 'Unknown Creator';
  if (gameData.ownerUsername) {
    // Use the stored username
    ownerName = gameData.ownerUsername;
  } else if (gameData.ownerId) {
    // Fallback: fetch from verified_users collection
    try {
      const db = window.firebaseFirestore;
      const verifiedRef = window.firestoreDoc(db, 'verified_users', gameData.ownerId);
      const verifiedSnap = await window.firestoreGetDoc(verifiedRef);
      if (verifiedSnap.exists() && verifiedSnap.data().username) {
        ownerName = verifiedSnap.data().username;
      }
    } catch (err) {
      console.warn('Could not fetch verified username:', err);
    }
  }
  
  card.innerHTML = `
    <div class="card-image">
      <img src="${gameData.coverImageUrl || 'default-cover.png'}" alt="${gameData.title}">
    </div>
    <div class="card-content">
      <h3 class="card-title">${gameData.title}</h3>
      <p class="card-description">${gameData.description}</p>
      <p class="card-developer">Made by <strong>${ownerName}</strong></p>
      <div class="card-tags">
        ${(gameData.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
  `;
  
  return card;
}

// ===================================================================
// EXAMPLE 2: Display article author username
// ===================================================================

async function renderArticleCard(articleData) {
  const card = document.createElement('div');
  card.className = 'article-card';
  
  // Get the author username
  let authorName = 'Anonymous';
  if (articleData.authorUsername) {
    // Use the stored username
    authorName = articleData.authorUsername;
  } else if (articleData.authorUid) {
    // Fallback: fetch from verified_users collection
    try {
      const db = window.firebaseFirestore;
      const verifiedRef = window.firestoreDoc(db, 'verified_users', articleData.authorUid);
      const verifiedSnap = await window.firestoreGetDoc(verifiedRef);
      if (verifiedSnap.exists() && verifiedSnap.data().username) {
        authorName = verifiedSnap.data().username;
      }
    } catch (err) {
      console.warn('Could not fetch verified username:', err);
    }
  }
  
  card.innerHTML = `
    <div class="article-header">
      <h2>${articleData.title}</h2>
      <p class="article-meta">
        By <strong>${authorName}</strong> • ${formatDate(articleData.publishedAt)}
      </p>
    </div>
    <div class="article-summary">
      <p>${articleData.summary}</p>
    </div>
    <a href="article.html?id=${articleData.id}" class="read-more">Read More →</a>
  `;
  
  return card;
}

// ===================================================================
// EXAMPLE 3: Batch load usernames for multiple items (more efficient)
// ===================================================================

async function loadUsernames(userIds) {
  const db = window.firebaseFirestore;
  const usernameMap = new Map();
  
  // Batch load all verified users
  const promises = userIds.map(async (uid) => {
    try {
      const verifiedRef = window.firestoreDoc(db, 'verified_users', uid);
      const verifiedSnap = await window.firestoreGetDoc(verifiedRef);
      if (verifiedSnap.exists() && verifiedSnap.data().username) {
        usernameMap.set(uid, verifiedSnap.data().username);
      }
    } catch (err) {
      console.warn(`Could not fetch username for ${uid}:`, err);
    }
  });
  
  await Promise.all(promises);
  return usernameMap;
}

async function renderGameList(games) {
  // Get all unique owner IDs
  const ownerIds = [...new Set(games.map(g => g.ownerId).filter(Boolean))];
  
  // Load all usernames at once
  const usernameMap = await loadUsernames(ownerIds);
  
  // Render each game card
  const container = document.getElementById('games-container');
  for (const game of games) {
    let ownerName = 'Unknown Creator';
    if (game.ownerUsername) {
      ownerName = game.ownerUsername;
    } else if (game.ownerId && usernameMap.has(game.ownerId)) {
      ownerName = usernameMap.get(game.ownerId);
    }
    
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <h3>${game.title}</h3>
      <p>Made by <strong>${ownerName}</strong></p>
    `;
    container.appendChild(card);
  }
}

// ===================================================================
// EXAMPLE 4: Using the helper module for cleaner code
// ===================================================================

import { getCachedUsername } from './verified-user-helper.js';

async function renderGameCardWithHelper(gameData) {
  // This approach uses the helper module with caching
  let ownerName = 'Unknown Creator';
  
  if (gameData.ownerUsername) {
    ownerName = gameData.ownerUsername;
  } else if (gameData.ownerId) {
    const username = await getCachedUsername(gameData.ownerId);
    if (username) ownerName = username;
  }
  
  return `
    <div class="game-card">
      <h3>${gameData.title}</h3>
      <p>Made by <strong>${ownerName}</strong></p>
    </div>
  `;
}

// ===================================================================
// EXAMPLE 5: Update existing games.html hardcoded names
// ===================================================================

// BEFORE (hardcoded):
// <p class="card-developer">Made by <a href="about.html"><strong>NanoShade Studios</strong></a></p>

// AFTER (dynamic):
function getGameDeveloperHTML(game) {
  // For official GlitchRealm games, keep the studio name
  const officialGames = {
    'bytesurge': 'NanoShade Studios',
    'coderunner': 'NanoShade Studios',
    'neurocore': 'InfinityByte Studios'
  };
  
  if (officialGames[game.gameId]) {
    return `Made by <a href="about.html"><strong>${officialGames[game.gameId]}</strong></a>`;
  }
  
  // For user-submitted games, show the username
  const ownerName = game.ownerUsername || 'Community Creator';
  return `Made by <strong>${ownerName}</strong>`;
}

// Usage in your rendering code:
// const developerHTML = getGameDeveloperHTML(gameData);
// document.querySelector('.card-developer').innerHTML = developerHTML;

// ===================================================================
// EXAMPLE 6: Migration script to add usernames to existing content
// ===================================================================

async function migrateExistingContent() {
  const db = window.firebaseFirestore;
  
  
  // Get all verified users
  const verifiedSnapshot = await window.firestoreGetDocs(
    window.firestoreCollection(db, 'verified_users')
  );
  
  for (const userDoc of verifiedSnapshot.docs) {
    const uid = userDoc.id;
    const username = userDoc.data().username;
    
    if (!username) {
      continue;
    }
    
    
    // Update all game submissions by this user
    const gamesQuery = window.firestoreQuery(
      window.firestoreCollection(db, 'game_submissions'),
      window.firestoreWhere('ownerId', '==', uid)
    );
    const gamesDocs = await window.firestoreGetDocs(gamesQuery);
    
    let gamesUpdated = 0;
    for (const gameDoc of gamesDocs.docs) {
      try {
        await window.firestoreUpdateDoc(gameDoc.ref, { 
          ownerUsername: username 
        });
        gamesUpdated++;
      } catch (err) {
        console.error(`Failed to update game ${gameDoc.id}:`, err);
      }
    }
    
    // Update all articles by this user
    const articlesQuery = window.firestoreQuery(
      window.firestoreCollection(db, 'news_articles'),
      window.firestoreWhere('authorUid', '==', uid)
    );
    const articlesDocs = await window.firestoreGetDocs(articlesQuery);
    
    let articlesUpdated = 0;
    for (const articleDoc of articlesDocs.docs) {
      try {
        await window.firestoreUpdateDoc(articleDoc.ref, { 
          authorUsername: username 
        });
        articlesUpdated++;
      } catch (err) {
        console.error(`Failed to update article ${articleDoc.id}:`, err);
      }
    }
  }
  
}

// Run migration (only once, from browser console):
// await migrateExistingContent();

// ===================================================================
// Helper function for date formatting
// ===================================================================
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}
