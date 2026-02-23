import { SUPABASE_CONFIG } from './supabase-config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.1/+esm';
import { redirectToAuth, onAuthChange } from './auth-sync.js';

// Firestore (for structured article metadata) & Supabase (for media storage)
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Wait for Firebase to initialize
async function waitForFirebase() {
  if (window.firebaseApp) return window.firebaseApp;
  
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.firebaseApp) {
        clearInterval(checkInterval);
        resolve(window.firebaseApp);
      }
    }, 100);
    
    // Also listen for the custom event
    window.addEventListener('firebaseAuthStateChanged', () => {
      if (window.firebaseApp) {
        clearInterval(checkInterval);
        resolve(window.firebaseApp);
      }
    }, { once: true });
  });
}

let db;
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Developer / editor UIDs allowed to publish
const EDITOR_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

// Collection refs - initialized after Firebase is ready
let ARTICLES_COL;
let TAGS_COL;

// Developer UIDs
const DEV_UIDS = new Set([
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
]);

// Cache verified writer status
const verifiedWritersCache = new Map();

async function checkVerifiedWriter(uid) {
  if (!uid) return false;
  
  
  if (DEV_UIDS.has(uid)) {
    verifiedWritersCache.set(uid, true);
    return true;
  }
  
  if (verifiedWritersCache.has(uid)) {
    return verifiedWritersCache.get(uid);
  }
  
  try {
    const writerDoc = await getDoc(doc(db, 'verified_writers', uid));
    const isVerified = writerDoc.exists() && writerDoc.data()?.verified === true;
    verifiedWritersCache.set(uid, isVerified);
    return isVerified;
  } catch (err) {
    console.warn('Error checking verified writer:', err);
    verifiedWritersCache.set(uid, false);
    return false;
  }
}

// DOM refs
const articleListEl = document.getElementById('article-list');
const latestListEl = document.getElementById('latest-list');
const tagCloudEl = document.getElementById('tag-cloud');
const emptyPlaceholderEl = document.getElementById('empty-placeholder');
const createFirstBtn = document.getElementById('create-first-article');
const publishArticleBtn = document.getElementById('publish-article-btn');
const getVerifiedBtn = document.getElementById('get-verified-btn');
const spinnerEl = document.getElementById('news-spinner');

// Filter buttons
const filterButtons = Array.from(document.querySelectorAll('.news-actions button'));
let activeFilter = 'all';

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.id.replace('filter-','');
    filterButtons.forEach(b => b.classList.toggle('active', b===btn));
    renderArticles();
  });
});

// Subscribe form (placeholder local only)
const subscribeForm = document.getElementById('news-subscribe-form');
if(subscribeForm){
  subscribeForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = new FormData(subscribeForm).get('email');
    alert('Subscription placeholder saved locally: '+ email + '\n(Integrate with mailing service later)');
    subscribeForm.reset();
  });
}

// Basic cache for loaded articles
let articlesCache = [];

async function loadArticles(){
  // Query only published articles (draft == false) so unauthenticated users can read
  const q = query(
    ARTICLES_COL, 
    where('draft', '==', false),
    orderBy('publishedAt','desc'), 
    limit(100)
  );
  const snap = await getDocs(q);
  articlesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Pre-load verified status for all authors
  const uniqueAuthors = [...new Set(articlesCache.map(a => a.authorUid).filter(Boolean))];
  await Promise.all(uniqueAuthors.map(uid => checkVerifiedWriter(uid)));
}

function formatDate(ts){
  if(!ts) return '';
  try {
    if(ts.toDate) return ts.toDate().toLocaleDateString(undefined,{month:'short', day:'numeric', year:'numeric'});
    return new Date(ts).toLocaleDateString();
  } catch { return ''; }
}

function renderArticles(){
  if(!articlesCache.length){
    articleListEl.innerHTML = '';
    emptyPlaceholderEl.style.display = 'block';
    return;
  }
  emptyPlaceholderEl.style.display = 'none';
  const filtered = articlesCache.filter(a => activeFilter==='all' || (a.categories||[]).includes(activeFilter));
  if(!filtered.length){
    articleListEl.innerHTML = '<div class="empty-state" style="border-style:dashed; padding:40px 30px;"><h2>No Articles For This Filter</h2><p>Try switching filters or check back later for new content.</p></div>';
    return;
  }
  articleListEl.innerHTML = filtered.map(a => articleCardHTML(a)).join('');
}

function articleCardHTML(a){
  const tagsHTML = (a.tags||[]).map(t=>`<span>${t}</span>`).join('');
  const mediaHTML = a.coverImageUrl ? `<div style="margin:-10px -14px 18px; overflow:hidden; border-radius:12px; border:1px solid rgba(0,255,249,0.15);"><img src="${a.coverImageUrl}" alt="Cover" style="display:block; width:100%; max-height:300px; object-fit:cover;"></div>` : '';
  
  // Check if author is verified (from cache)
  const isVerified = a.authorUid ? verifiedWritersCache.get(a.authorUid) || false : false;
  
  // Debug logging
  if (a.authorUid) {
  }
  
  // Add verified writer badge if applicable
  let authorHTML = '';
  if (a.authorUsername) {
    authorHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">By ${escapeHTML(a.authorUsername)}`;
    if (isVerified) {
      // Simple SVG with solid blue color (more reliable than gradient in innerHTML)
      authorHTML += `<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border-radius:50%;" title="Verified Writer" aria-label="Verified Writer"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:16px;height:16px;fill:#0099ff;filter:drop-shadow(0 0 4px rgba(0,153,255,0.6));"><path d="M12 2l2.9 2.1 3.5-.3 1.1 3.3 3 1.8-1.2 3.3 1.2 3.3-3 1.8-1.1 3.3-3.5-.3L12 22l-2.9-2.1-3.5.3-1.1-3.3-3-1.8L2.7 12 1.5 8.7l3-1.8 1.1-3.3 3.5.3L12 2zm-1.2 13.6l6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4 3.6 3.6z"/></svg></span>`;
    }
    authorHTML += `</span> · `;
  }
  
  return `<article class="article-card" data-id="${a.id}" onclick="window.location.href='news-article.html?id=${a.id}'" style="cursor:pointer;">
    ${mediaHTML}
    <div class="article-meta">${authorHTML}${formatDate(a.publishedAt)} · ${ (a.categories||[]).join(', ') }</div>
    <h2>${escapeHTML(a.title||'Untitled')}</h2>
    <p class="article-summary">${escapeHTML(a.summary||'')}</p>
    <div class="article-tags">${tagsHTML}</div>
    <a href="news-article.html?id=${a.id}" class="read-more" onclick="event.stopPropagation()">Read More</a>
  </article>`;
}

function escapeHTML(str=''){ return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

async function renderLatest(){
  const latest = articlesCache.slice(0,6);
  latestListEl.innerHTML = latest.map(a=>`<a href="news-article.html?id=${a.id}" style="text-decoration:none; color:#cfe5e8;">${escapeHTML(a.title)}</a>`).join('<br>');
}

async function renderTags(){
  // aggregate tags
  const counts = {};
  for(const a of articlesCache){
    (a.tags||[]).forEach(t => counts[t] = (counts[t]||0)+1);
  }
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,30);
  tagCloudEl.innerHTML = sorted.map(([t])=>`<a href="#" data-tag="${t}">${t}</a>`).join('');
  tagCloudEl.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    activeFilter = 'all';
    filterButtons.forEach(b=>b.classList.remove('active'));
    // Quick tag filter via search
    const tag = a.getAttribute('data-tag');
    const filtered = articlesCache.filter(ar => (ar.tags||[]).includes(tag));
    articleListEl.innerHTML = filtered.map(ar => articleCardHTML(ar)).join('') || '<div class="empty-state"><h2>No Articles With Tag</h2></div>';
  }));
}

// Initialize Firebase and Firestore
async function initializeFirebase() {
  const app = await waitForFirebase();
  db = getFirestore(app);
  ARTICLES_COL = collection(db, 'news_articles');
  TAGS_COL = collection(db, 'news_tags');
}

// Show create button if verified writer
async function checkEditorAccess() {
  await waitForFirebase();
  
  // Use auth sync module
  onAuthChange(async (user) => {
    if (user) {
      // Check if user is a verified writer
      try {
        const writerDoc = await getDoc(doc(db, 'verified_writers', user.uid));
        const isVerifiedWriter = writerDoc.exists() && writerDoc.data()?.verified === true;
        
        if (isVerifiedWriter) {
          // Show publish button for verified writers
          if (createFirstBtn) {
            createFirstBtn.style.display = 'inline-block';
          }
          if (publishArticleBtn) {
            publishArticleBtn.style.display = 'inline-block';
          }
        } else {
          // Show get verified button for non-verified users
          if (getVerifiedBtn) {
            getVerifiedBtn.style.display = 'inline-block';
          }
        }
      } catch (err) {
        console.warn('Error checking writer status:', err);
      }
    }
  });
}

createFirstBtn?.addEventListener('click', () => {
  window.location.href = 'publish.html';
});

publishArticleBtn?.addEventListener('click', () => {
  window.location.href = 'publish.html';
});

getVerifiedBtn?.addEventListener('click', () => {
  window.location.href = 'request-verification.html';
});

(async function init() {
  try {
    await initializeFirebase();
    checkEditorAccess(); // Run in parallel
    // show spinner while loading
    if (spinnerEl) {
      spinnerEl.style.display = 'block';
    }
    if (articleListEl) articleListEl.style.display = 'none';
    if (emptyPlaceholderEl) emptyPlaceholderEl.style.display = 'none';
    await loadArticles();
    renderArticles();
    renderLatest();
    renderTags();
    if (!articlesCache.length) {
      // keep spinner visible when there are no articles and hide the footer
      if (spinnerEl) spinnerEl.style.display = 'block';
      document.getElementById('site-footer')?.style.setProperty('display','none');
      if (articleListEl) articleListEl.innerHTML = '';
      if (emptyPlaceholderEl) emptyPlaceholderEl.style.display = 'none';
      return;
    }
    // we have articles — hide spinner and show list/footer
    if (spinnerEl) spinnerEl.style.display = 'none';
    if (articleListEl) articleListEl.style.display = '';
    document.getElementById('site-footer')?.style.removeProperty('display');
  } catch (err) {
    console.error('Error loading news articles:', err);
    if (spinnerEl) spinnerEl.style.display = 'none';
    articleListEl.innerHTML = '<div class="empty-state"><h2>Error Loading Articles</h2><p>Try again later.</p></div>';
  }
})();
