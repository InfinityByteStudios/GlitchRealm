import { getFirestore, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthChange } from './auth-sync.js';

const db = getFirestore(window.firebaseApp);
let currentUser = null;
let currentArticle = null;

// Track auth state
onAuthChange((user) => {
  currentUser = user;
  // Reload article to show/hide edit buttons
  if (currentArticle) {
    updateArticleActions();
  }
});

const DEV_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

async function isVerifiedWriter(uid) {
  // Developers are always verified
  if (DEV_UIDS.includes(uid)) {
    return true;
  }
  
  try {
    const writerDoc = await getDoc(doc(db, 'verified_writers', uid));
    return writerDoc.exists() && writerDoc.data()?.verified === true;
  } catch (err) {
    console.warn('Error checking verified writer status:', err);
    return false;
  }
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return '';
  return timestamp.toDate().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function updateArticleActions() {
  const actionsContainer = document.getElementById('article-actions');
  if (!actionsContainer) return;
  
  const isAuthor = currentUser && currentArticle && currentUser.uid === currentArticle.authorUid;
  const isDev = currentUser && DEV_UIDS.includes(currentUser.uid);
  
  if (isAuthor || isDev) {
    actionsContainer.style.display = 'flex';
  } else {
    actionsContainer.style.display = 'none';
  }
}

async function deleteArticle() {
  if (!currentArticle || !currentUser) return;
  
  const confirmed = confirm('Are you sure you want to delete this article? This action cannot be undone.');
  if (!confirmed) return;
  
  try {
    const articleRef = doc(db, 'news_articles', currentArticle.id);
    await deleteDoc(articleRef);
    alert('Article deleted successfully!');
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to delete article: ' + err.message);
  }
}

function editArticle() {
  if (!currentArticle) return;
  window.location.href = `publish.html?edit=${currentArticle.id}`;
}

function qs(key){
  const params = new URLSearchParams(location.search);
  return params.get(key);
}

function escapeHTML(str=''){ return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

function renderMarkdown(md=''){
  // Ultra-light markdown (headings, bold, italics, code, links, lists, blockquotes)
  let html = md;
  
  // Code blocks (```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Blockquotes
  html = html.replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>');
  
  // Headings
  html = html
    .replace(/^### (.*$)/gim,'<h3>$1</h3>')
    .replace(/^## (.*$)/gim,'<h2>$1</h2>')
    .replace(/^# (.*$)/gim,'<h2>$1</h2>');
  
  // Bold and italic
  html = html
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/__(.*?)__/g,'<strong>$1</strong>')
    .replace(/_(.*?)_/g,'<em>$1</em>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g,'<code>$1</code>');
  
  // Links
  html = html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Lists (unordered)
  html = html.replace(/(?:^|\n)- (.*?)(?=\n(?:[^-]|$))/gm, function(match) {
    const items = match.trim().split(/\n- /).map(i => i.trim()).filter(Boolean);
    return '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
  });
  
  // Lists (ordered)
  html = html.replace(/(?:^|\n)\d+\. (.*?)(?=\n(?:[^\d]|$))/gm, function(match) {
    const items = match.trim().split(/\n\d+\. /).map(i => i.trim()).filter(Boolean);
    return '<ol>' + items.map(i => `<li>${i}</li>`).join('') + '</ol>';
  });
  
  // Paragraphs (split by double newlines, but avoid wrapping already-wrapped elements)
  html = html.split(/\n{2,}/).map(block => {
    block = block.trim();
    if (!block) return '';
    if (/<h\d|<ul|<ol|<pre|<blockquote|<div/.test(block)) return block;
    return `<p>${block}</p>`;
  }).join('\n');
  
  return html;
}

async function loadArticle(){
  const id = qs('id');
  if(!id){
    document.getElementById('article-view').innerHTML = '<div class="empty-state"><h2>Article Not Found</h2></div>';
    return;
  }
  try {
    const ref = doc(db,'news_articles',id);
    const snap = await getDoc(ref);
    if(!snap.exists()){
      document.getElementById('article-view').innerHTML = '<div class="empty-state"><h2>Article Not Found</h2></div>';
      return;
    }
    const data = snap.data();
    currentArticle = { id, ...data };
    
    document.getElementById('article-title').textContent = data.title || 'Untitled';
    
    // Check if author is verified
    const authorIsVerified = data.authorUid ? await isVerifiedWriter(data.authorUid) : false;
    
    // Build meta line with verified writer badge and proper casing
    let metaHTML = '';
    if (data.authorUsername) {
      metaHTML += `<span class="author-name">By ${escapeHTML(data.authorUsername)}</span>`;
      if (authorIsVerified) {
        metaHTML += `<span class="verified-badge" title="Verified Writer" aria-label="Verified Writer"><svg viewBox="0 0 24 24"><defs><linearGradient id="blueGradientArticle" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0099ff;stop-opacity:1"/><stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1"/></linearGradient></defs><path d="M12 2l2.9 2.1 3.5-.3 1.1 3.3 3 1.8-1.2 3.3 1.2 3.3-3 1.8-1.1 3.3-3.5-.3L12 22l-2.9-2.1-3.5.3-1.1-3.3-3-1.8L2.7 12 1.5 8.7l3-1.8 1.1-3.3 3.5.3L12 2zm-1.2 13.6l6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4 3.6 3.6z"/></svg></span>`;
      }
    }
    
    // Categories and date in separate span with uppercase
    let categoryDateHTML = '';
    if (data.categories?.length) {
      categoryDateHTML += data.categories.join(', ');
    }
    if (data.publishedAt?.toDate) {
      if (categoryDateHTML) categoryDateHTML += ' · ';
      categoryDateHTML += formatDate(data.publishedAt);
    }
    
    if (categoryDateHTML) {
      if (metaHTML) metaHTML += '<span>·</span>';
      metaHTML += `<span class="category-date">${categoryDateHTML}</span>`;
    }
    
    // Add "Last edited" if article was edited after creation
    if (data.lastEditedAt?.toDate) {
      const editedDate = formatDate(data.lastEditedAt);
      if (metaHTML) metaHTML += '<span>·</span>';
      metaHTML += `<span class="last-edited" style="color:#ffb366;font-style:italic;">Last edited: ${editedDate}</span>`;
    }
    
    document.getElementById('article-meta').innerHTML = metaHTML;

    if(data.coverImageUrl){
      const cover = document.getElementById('cover-container');
      cover.style.display='block';
      cover.innerHTML = `<img src="${data.coverImageUrl}" alt="Cover">`;
    }
    
    // Show summary if available
    if (data.summary) {
      const summaryEl = document.createElement('div');
      summaryEl.className = 'article-summary';
      summaryEl.textContent = data.summary;
      document.getElementById('article-content').before(summaryEl);
    }

    if(data.embed){
      const embed = document.getElementById('embed-container');
      embed.style.display='block';
      // Basic YouTube or generic iframe embed
      if(/youtube.com|youtu.be/.test(data.embed)){
        let vid = data.embed.match(/[?&]v=([^&]+)/)?.[1] || data.embed.split('/').pop();
        embed.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        embed.innerHTML = `<iframe src="${data.embed}" frameborder="0"></iframe>`;
      }
    }

    document.getElementById('article-content').innerHTML = renderMarkdown(escapeHTML(data.content||''));

    const tagsEl = document.getElementById('article-tags');
    tagsEl.innerHTML = (data.tags||[]).map(t=>`<span>${t}</span>`).join('');
    
    // Update action buttons visibility
    updateArticleActions();
  } catch(err){
    console.error('Article load error', err);
    document.getElementById('article-view').innerHTML = '<div class="empty-state"><h2>Error Loading Article</h2></div>';
  }
}

// Expose functions to window for button clicks
window.editArticle = editArticle;
window.deleteArticle = deleteArticle;

loadArticle();
