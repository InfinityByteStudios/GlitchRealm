import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const db = getFirestore(window.firebaseApp);

function qs(key){
  const params = new URLSearchParams(location.search);
  return params.get(key);
}

function escapeHTML(str=''){ return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

function renderMarkdown(md=''){
  // Ultra-light markdown (headings, bold, italics, code, links, lists)
  let html = md
    .replace(/^### (.*$)/gim,'<h3>$1</h3>')
    .replace(/^## (.*$)/gim,'<h2>$1</h2>')
    .replace(/^# (.*$)/gim,'<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\n\n- (.*?)(\n|$)/g, (m,g1) => '<ul><li>'+g1.split(/\n- /).map(i=>i.trim()).join('</li><li>')+'</li></ul>')
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  // paragraphs
  html = html.split(/\n{2,}/).map(block => /<h\d|<ul|<pre|<blockquote/.test(block) ? block : `<p>${block}</p>`).join('\n');
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
    document.getElementById('article-title').textContent = data.title || 'Untitled';
    
    // Build meta line with optional verified writer badge
    let metaHTML = '';
    if (data.authorUsername) {
      metaHTML += `<span style="display:inline-flex;align-items:center;gap:6px;">By ${escapeHTML(data.authorUsername)}`;
      if (data.isVerifiedWriter) {
        metaHTML += `<span style="display:inline-block;background:linear-gradient(135deg,#0099ff,#00d4ff);padding:3px 8px;border-radius:10px;font-size:0.5rem;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#fff;box-shadow:0 2px 6px rgba(0,153,255,0.4);">Verified Writer</span>`;
      }
      metaHTML += `</span>`;
    }
    if (data.categories?.length) {
      metaHTML += ` · ${data.categories.join(', ')}`;
    }
    if (data.publishedAt?.toDate) {
      metaHTML += ` · ${data.publishedAt.toDate().toLocaleDateString()}`;
    }
    
    document.getElementById('article-meta').innerHTML = metaHTML;

    if(data.coverImageUrl){
      const cover = document.getElementById('cover-container');
      cover.style.display='block';
      cover.innerHTML = `<img src="${data.coverImageUrl}" alt="Cover">`;
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
  } catch(err){
    console.error('Article load error', err);
    document.getElementById('article-view').innerHTML = '<div class="empty-state"><h2>Error Loading Article</h2></div>';
  }
}

loadArticle();
