// Community page logic: list posts, create post modal, basic filters
(function(){
  const auth = window.firebaseAuth;
  let db;
  let lastCursor = null;
  const pageSize = 10;
  const postsList = document.getElementById('posts-list');
  const emptyEl = document.getElementById('posts-empty');
  const loadMoreBtn = document.getElementById('load-more');
  const createBtn = document.getElementById('create-post-btn');
  const filterTag = document.getElementById('filter-tag');
  const sortOrder = document.getElementById('sort-order');

  function ensureFirestore(){
    if (!db) {
      // compat API
      // eslint-disable-next-line no-undef
      db = firebase.firestore();
    }
    return db;
  }

  function postCard(doc){
    const d = doc.data();
    const tags = (d.tags || []).map(t => `<span class="tag">#${escapeHtml(String(t))}</span>`).join(' ');
    const likes = d.likesCount || 0;
    const date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();
    return `
      <article class="game-card" data-id="${doc.id}">
        <div class="card-content">
          <h3 class="card-title">${escapeHtml(d.title || 'Untitled')}</h3>
          <p class="card-description">${escapeHtml((d.body || '').slice(0, 220))}${(d.body||'').length>220?'…':''}</p>
          <div class="card-tags">${tags}</div>
          <div class="card-meta" style="display:flex; gap:12px; align-items:center; opacity:0.85; margin-top:8px;">
            <span title="Likes">❤ ${likes}</span>
            <span title="Date">${date.toLocaleDateString()}</span>
          </div>
        </div>
      </article>`;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  async function loadPosts(reset){
    postsList.setAttribute('aria-busy','true');
    const _db = ensureFirestore();
    // Use flat collection 'community_posts'
    let base = _db.collection('community_posts');

    // Query by status
    let query = base.where('status','==','published');
    const tag = filterTag.value.trim();
    if (tag) query = query.where('tags','array-contains', tag);
  if (sortOrder.value === 'top') {
      query = query.orderBy('likesCount','desc').orderBy('createdAt','desc');
    } else {
      query = query.orderBy('createdAt','desc');
    }
    if (!reset && lastCursor) query = query.startAfter(lastCursor);
    query = query.limit(pageSize);

    const snap = await query.get();
    if (reset) postsList.innerHTML = '';
    if (snap.empty && (reset || postsList.children.length === 0)) {
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
    }
    const items = [];
    snap.forEach(doc => items.push(postCard(doc)));
    postsList.insertAdjacentHTML('beforeend', items.join(''));
    lastCursor = snap.docs[snap.docs.length - 1] || null;
    loadMoreBtn.style.display = snap.size === pageSize ? 'inline-flex' : 'none';
    postsList.setAttribute('aria-busy','false');
  }

  function openCreateModal(){
    const user = auth && auth.currentUser;
    if (!user) {
      alert('Please sign in to post.');
      return;
    }
    document.getElementById('create-post-modal').style.display='block';
  }
  function closeCreateModal(){
    document.getElementById('create-post-modal').style.display='none';
  }

  async function handleCreatePost(e){
    e.preventDefault();
    const user = auth && auth.currentUser;
    if (!user) {
      alert('Please sign in to post.');
      return;
    }
    // eslint-disable-next-line no-undef
    const _db = ensureFirestore();
    const title = document.getElementById('post-title').value.trim();
    const body = document.getElementById('post-body').value.trim();
    const tags = document.getElementById('post-tags').value.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean).slice(0,10);
    if (!title || !body) return;
    const now = new Date();
    try {
      await _db.collection('community_posts').add({
        title,
        body,
        tags,
        userId: user.uid,
        createdAt: firebase.firestore.Timestamp.fromDate(now),
        updatedAt: firebase.firestore.Timestamp.fromDate(now),
        status: 'published',
        likesCount: 0,
        commentsCount: 0
      });
      closeCreateModal();
      document.getElementById('create-post-form').reset();
      lastCursor = null;
      loadPosts(true);
    } catch(err){
      console.error(err);
      alert('Failed to publish.');
    }
  }


  document.addEventListener('DOMContentLoaded', function(){
    // Wire UI
    createBtn && createBtn.addEventListener('click', openCreateModal);
    document.getElementById('close-create-post')?.addEventListener('click', closeCreateModal);
    document.getElementById('create-post-form')?.addEventListener('submit', handleCreatePost);
    filterTag && filterTag.addEventListener('change', ()=>loadPosts(true));
    sortOrder && sortOrder.addEventListener('change', ()=>loadPosts(true));
    loadMoreBtn && loadMoreBtn.addEventListener('click', ()=>loadPosts(false));
    // Initial load
    loadPosts(true);

    // Hide create button when signed out
    if (auth) {
      auth.onAuthStateChanged((u)=>{
        if (createBtn) {
          createBtn.style.display = u ? 'inline-flex' : 'none';
        }
  // no-op; index-builder UI removed
      });
    }
  });
})();
