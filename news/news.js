import { SUPABASE_CONFIG } from '../supabase-config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.1/+esm';

// Firestore (for structured article metadata) & Supabase (for media storage)
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = window.firebaseApp; // from firebase-core.js
const db = getFirestore(app);

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Developer / editor UIDs allowed to publish
const EDITOR_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

// Collection refs
const ARTICLES_COL = collection(db, 'news_articles');
const TAGS_COL = collection(db, 'news_tags');

// DOM refs
const articleListEl = document.getElementById('article-list');
const latestListEl = document.getElementById('latest-list');
const tagCloudEl = document.getElementById('tag-cloud');
const emptyPlaceholderEl = document.getElementById('empty-placeholder');
const createFirstBtn = document.getElementById('create-first-article');

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
  const q = query(ARTICLES_COL, orderBy('publishedAt','desc'), limit(100));
  const snap = await getDocs(q);
  articlesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  return `<article class="article-card" data-id="${a.id}">
    ${mediaHTML}
    <div class="article-meta">${formatDate(a.publishedAt)} · ${ (a.categories||[]).join(', ') }</div>
    <h2>${escapeHTML(a.title||'Untitled')}</h2>
    <p class="article-summary">${escapeHTML(a.summary||'')}</p>
    <div class="article-tags">${tagsHTML}</div>
    <a href="news-article.html?id=${a.id}" class="read-more">Read More</a>
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

// Show create button if editor
firebase.auth().onAuthStateChanged(user => {
  if(user && EDITOR_UIDS.includes(user.uid)){
    createFirstBtn.style.display = 'inline-block';
  }
});

createFirstBtn?.addEventListener('click', () => {
  window.location.href = 'publish.html';
});

(async function init(){
  try {
    await loadArticles();
    renderArticles();
    renderLatest();
    renderTags();
    if(!articlesCache.length){
      emptyPlaceholderEl.style.display = 'block';
    }
  } catch(err){
    console.error('Error loading news articles:', err);
    articleListEl.innerHTML = '<div class="empty-state"><h2>Error Loading Articles</h2><p>Try again later.</p></div>';
  }
})();
