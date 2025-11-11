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
    
    // Fetch author avatar if available
    let authorAvatar = '';
    if (data.authorUid) {
      try {
        // Dynamically import Firestore functions
        const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const db = getFirestore(window.firebaseApp);
        const userDoc = doc(db, 'users', data.authorUid);
        const userData = await getDoc(userDoc);
        if (userData.exists()) {
          const avatarUrl = userData.data().avatarUrl;
          if (avatarUrl) {
            authorAvatar = avatarUrl;
          }
        }
      } catch (e) {
        console.warn('Could not fetch author avatar:', e);
      }
    }
    
    // Build meta line with avatar, verified writer badge and proper casing
    let metaHTML = '';
    if (data.authorUsername) {
      // Add avatar if available
      if (authorAvatar) {
        metaHTML += `<img src="${escapeHTML(authorAvatar)}" alt="${escapeHTML(data.authorUsername)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,255,249,0.3);margin-right:6px;">`;
      }
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
    
    // Show summary if available (with markdown support)
    if (data.summary) {
      const summaryEl = document.createElement('div');
      summaryEl.className = 'article-summary';
      summaryEl.innerHTML = renderMarkdown(escapeHTML(data.summary));
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
    
    // Display sources/citations if any
    if (data.sources && data.sources.length > 0) {
      const sourcesContainer = document.createElement('div');
      sourcesContainer.className = 'article-sources';
      sourcesContainer.style.cssText = 'margin:40px 0; padding:24px; background:rgba(0,255,249,0.05); border:1px solid rgba(0,255,249,0.2); border-radius:12px;';
      
      const citationFormat = data.citationFormat || 'simple';
      const sourcesHTML = data.sources.map((source, index) => {
        let citation = '';
        
        switch(citationFormat) {
          case 'apa':
            // APA: Author (Year). Title. URL
            citation = `${escapeHTML(source.author)}${source.year ? ` (${source.year})` : ''}. <em>${escapeHTML(source.title)}</em>. <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer" style="color:#00fff9; text-decoration:underline;">${escapeHTML(source.url)}</a>`;
            break;
          case 'mla':
            // MLA: Author. "Title." URL, Year.
            citation = `${escapeHTML(source.author)}. "${escapeHTML(source.title)}." <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer" style="color:#00fff9; text-decoration:underline;">${escapeHTML(source.url)}</a>${source.year ? `, ${source.year}` : ''}.`;
            break;
          case 'chicago':
            // Chicago: Author. "Title." Accessed URL. Year.
            citation = `${escapeHTML(source.author)}. "${escapeHTML(source.title)}." Accessed <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer" style="color:#00fff9; text-decoration:underline;">${escapeHTML(source.url)}</a>${source.year ? `. ${source.year}` : ''}.`;
            break;
          case 'simple':
          default:
            // Simple: Title - URL
            citation = `<strong>${escapeHTML(source.title)}</strong> - <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer" style="color:#00fff9; text-decoration:underline;">${escapeHTML(source.url)}</a>`;
            break;
        }
        
        return `<div style="margin-bottom:12px; padding-left:20px; position:relative; font-size:0.85rem; line-height:1.6; color:#cfe2e6;">
          <span style="position:absolute; left:0; color:#00f5ff; font-weight:600;">[${index + 1}]</span>
          ${citation}
        </div>`;
      }).join('');
      
      sourcesContainer.innerHTML = `<h3 style="font-family:Orbitron;font-size:1rem;color:#00f5ff;margin:0 0 16px;letter-spacing:0.8px;">Sources & References</h3>${sourcesHTML}`;
      
      // Insert before tags
      tagsEl.before(sourcesContainer);
    }
    
    // Display social media links if any
    if (data.socialLinks && data.socialLinks.length > 0) {
      const socialContainer = document.getElementById('article-links');
      if (socialContainer) {
        socialContainer.style.display = 'block';
        const socialHTML = data.socialLinks.map(link => {
          const platform = link.platform.toLowerCase();
          let icon = '';
          
          // Generate appropriate icon based on platform
          if (platform.includes('twitter') || platform.includes('x')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
          } else if (platform.includes('discord')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/></svg>`;
          } else if (platform.includes('youtube')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
          } else if (platform.includes('twitch')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>`;
          } else if (platform.includes('facebook')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
          } else if (platform.includes('instagram')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>`;
          } else if (platform.includes('tiktok')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`;
          } else if (platform.includes('reddit')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>`;
          } else if (platform.includes('linkedin')) {
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
          } else {
            // Generic link icon for unknown platforms
            icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;margin-right:8px;"><path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8h-2V6.413l-7.793 7.794-1.414-1.414L17.585 5H13V3h8z"/></svg>`;
          }
          
          return `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" class="article-link social-link">
            ${icon}${escapeHTML(link.platform)}
          </a>`;
        }).join('');
        
        socialContainer.innerHTML = `<h3 style="font-family:Orbitron;font-size:1rem;color:#00f5ff;margin:0 0 12px;letter-spacing:0.8px;">Social Media</h3>${socialHTML}`;
      }
    }
    
    // Display related links if any (append to existing container or create new one)
    if (data.links && data.links.length > 0) {
      const linksContainer = document.getElementById('article-links');
      if (linksContainer) {
        // If social media links already added, append regular links after
        if (data.socialLinks && data.socialLinks.length > 0) {
          const linksHTML = data.links.map(link => 
            `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" class="article-link">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;margin-right:6px;">
                <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8h-2V6.413l-7.793 7.794-1.414-1.414L17.585 5H13V3h8z"/>
              </svg>
              ${escapeHTML(link.title)}
            </a>`
          ).join('');
          linksContainer.innerHTML += `<h3 style="font-family:Orbitron;font-size:1rem;color:#00f5ff;margin:24px 0 12px;letter-spacing:0.8px;">Related Links</h3>${linksHTML}`;
        } else {
          // No social media, just add regular links
          linksContainer.style.display = 'block';
          const linksHTML = data.links.map(link => 
            `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" class="article-link">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;margin-right:6px;">
                <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8h-2V6.413l-7.793 7.794-1.414-1.414L17.585 5H13V3h8z"/>
              </svg>
              ${escapeHTML(link.title)}
            </a>`
          ).join('');
          linksContainer.innerHTML = `<h3 style="font-family:Orbitron;font-size:1rem;color:#00f5ff;margin:0 0 12px;letter-spacing:0.8px;">Related Links</h3>${linksHTML}`;
        }
      }
    }
    
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
