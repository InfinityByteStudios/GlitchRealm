// Community page logic: list posts, create post modal, basic filters
(function(){
  const auth = window.firebaseAuth;
  // Modular Firestore helpers (lazy-loaded)
  let mfs = {
    db: null,
    collection: null,
    query: null,
    where: null,
    orderBy: null,
    startAfter: null,
    limit: null,
    getDocs: null,
    addDoc: null,
    Timestamp: null
  };
  let lastCursor = null;
  const pageSize = 10;
  const postsList = document.getElementById('posts-list');
  const emptyEl = document.getElementById('posts-empty');
  const loadMoreBtn = document.getElementById('load-more');
  const createBtn = document.getElementById('create-post-btn');
  const filterTag = document.getElementById('filter-tag');
  const sortOrder = document.getElementById('sort-order');

  async function ensureModFirestore(){
    if (mfs.db) return mfs;
    const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getFirestore, collection, query, where, orderBy, startAfter, limit, getDocs, addDoc, Timestamp } = mod;
    // Reuse default app initialized in page; getFirestore() will use it
    mfs.db = getFirestore();
    mfs.collection = collection;
    mfs.query = query;
    mfs.where = where;
    mfs.orderBy = orderBy;
    mfs.startAfter = startAfter;
    mfs.limit = limit;
    mfs.getDocs = getDocs;
    mfs.addDoc = addDoc;
    mfs.Timestamp = Timestamp;
    return mfs;
  }

  function postCard(doc){
    const d = doc.data();
    const tags = (d.tags || []).map(t => `<span class="tag">#${escapeHtml(String(t))}</span>`).join(' ');
    const likes = d.likesCount || 0;
    const date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();
    const author = escapeHtml(d.userDisplayName || d.userName || d.authorName || 'Anonymous');
    return `
      <article class="game-card" data-id="${doc.id}">
        <div class="card-content">
          <h3 class="card-title">${escapeHtml(d.title || 'Untitled')}</h3>
          <p class="card-description">${escapeHtml((d.body || '').slice(0, 220))}${(d.body||'').length>220?'…':''}</p>
          <div class="card-tags">${tags}</div>
          <div class="card-meta" style="display:flex; gap:12px; align-items:center; opacity:0.85; margin-top:8px; flex-wrap:wrap;">
            <span title="Author">👤 ${author}</span>
            <span title="Likes">❤ ${likes}</span>
            <span title="Date">${date.toLocaleDateString()}</span>
          </div>
          <div class="comments" id="comments-${doc.id}" style="margin-top:12px;">
            <div class="comments-list" data-loaded="0" style="display:flex; flex-direction:column; gap:8px;"></div>
            <div class="comment-compose" style="display:flex; gap:8px; margin-top:8px;">
              <input type="text" class="neural-input" placeholder="Write a reply..." style="flex:1; padding:8px;" />
              <button class="neural-button secondary comment-send"><span class="button-text">Reply</span></button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  async function loadPosts(reset){
    postsList.setAttribute('aria-busy','true');
    const tag = filterTag.value.trim();
    const f = await ensureModFirestore();
    try {
      const base = f.collection(f.db, 'community_posts');
      let q = f.query(base, f.where('status','==','published'));
      if (tag) q = f.query(q, f.where('tags','array-contains', tag));
      if (sortOrder.value === 'top') {
        q = f.query(q, f.orderBy('likesCount','desc'), f.orderBy('createdAt','desc'));
      } else {
        q = f.query(q, f.orderBy('createdAt','desc'));
      }
      if (!reset && lastCursor) q = f.query(q, f.startAfter(lastCursor));
      q = f.query(q, f.limit(pageSize));

      const snap = await f.getDocs(q);
      renderSnap(snap, reset);
    } catch (err) {
      console.warn('Primary Firestore query failed, falling back (likely missing indexes locally):', err && err.message ? err.message : err);
      await fallbackLoadPosts(reset, tag);
    } finally {
      postsList.setAttribute('aria-busy','false');
    }
  }

  function renderSnap(snap, reset){
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
  }

  async function fallbackLoadPosts(reset, tag){
    try {
      const f = await ensureModFirestore();
      // Fallback avoids composite indexes: fetch by createdAt only, client-filter/sort
      let q = f.query(
        f.collection(f.db, 'community_posts'),
        f.orderBy('createdAt','desc')
      );
      if (!reset && lastCursor) q = f.query(q, f.startAfter(lastCursor));
      q = f.query(q, f.limit(pageSize));
      const snap = await f.getDocs(q);

      // Client-side filter/sort
      let docs = snap.docs.map(d => ({ ref: d, data: d.data() }));
      docs = docs.filter(x => (x.data.status === 'published'));
      if (tag) {
        docs = docs.filter(x => Array.isArray(x.data.tags) && x.data.tags.includes(tag));
      }
      if (sortOrder.value === 'top') {
        docs.sort((a,b) => {
          const la = a.data.likesCount || 0;
          const lb = b.data.likesCount || 0;
          if (lb !== la) return lb - la;
          const da = a.data.createdAt?.toDate ? a.data.createdAt.toDate().getTime() : 0;
          const db = b.data.createdAt?.toDate ? b.data.createdAt.toDate().getTime() : 0;
          return db - da;
        });
      }
      // Trim to page size after filtering/sorting
      const pageDocs = docs.slice(0, pageSize);

      if (reset) postsList.innerHTML = '';
      if (pageDocs.length === 0 && (reset || postsList.children.length === 0)) {
        emptyEl.style.display = 'block';
      } else {
        emptyEl.style.display = 'none';
      }
      const html = pageDocs.map(x => postCard(x.ref)).join('');
      postsList.insertAdjacentHTML('beforeend', html);

      // Update cursor from original snapshot order
      lastCursor = snap.docs[snap.docs.length - 1] || null;
      // Only show Load More if we received a full page from Firestore
      loadMoreBtn.style.display = snap.size === pageSize ? 'inline-flex' : 'none';
    } catch (e) {
      console.error('Fallback load failed:', e);
      if (reset) postsList.innerHTML = '';
      emptyEl.style.display = 'block';
      loadMoreBtn.style.display = 'none';
    }
  }

  function openCreateModal(){
    const user = auth && auth.currentUser;
    if (!user) {
      alert('Please sign in to post.');
      return;
    }
    const modal = document.getElementById('create-post-modal');
    if (modal) {
      // Use flex to center via .auth-overlay styles
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }
  function closeCreateModal(){
    const modal = document.getElementById('create-post-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  async function handleCreatePost(e){
    e.preventDefault();
    const user = auth && auth.currentUser;
    if (!user) {
      alert('Please sign in to post.');
      return;
    }
    const f = await ensureModFirestore();
    const title = document.getElementById('post-title').value.trim();
    const body = document.getElementById('post-body').value.trim();
    const tags = document.getElementById('post-tags').value.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean).slice(0,10);
    if (!title || !body) return;
    const now = new Date();
    try {
      await mfs.addDoc(
        mfs.collection(mfs.db, 'community_posts'),
        {
          title,
          body,
          tags,
          userId: user.uid,
          authorName: user.displayName || (user.email?.split('@')[0]) || 'Anonymous',
          authorPhotoUrl: user.photoURL || '',
          createdAt: mfs.Timestamp.fromDate(now),
          updatedAt: mfs.Timestamp.fromDate(now),
          status: 'published',
          likesCount: 0,
          commentsCount: 0
        }
      );
      closeCreateModal();
      document.getElementById('create-post-form').reset();
      lastCursor = null;
      loadPosts(true);
    } catch(err){
      console.error('Create post failed:', err);
      const msg = (err && (err.code || err.message)) || '';
      if (msg.includes('permission') || msg.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
        alert('You do not have permission to publish. Ensure you are signed in and Firestore rules for community_posts are deployed.');
      } else {
        alert('Failed to publish. Please try again.');
      }
    }
  }


  document.addEventListener('DOMContentLoaded', function(){
    // Wire UI
    createBtn && createBtn.addEventListener('click', openCreateModal);
    document.getElementById('close-create-post')?.addEventListener('click', closeCreateModal);
    // Backdrop click to close
    const createPostModal = document.getElementById('create-post-modal');
    if (createPostModal) {
      createPostModal.addEventListener('click', (e) => {
        if (e.target === createPostModal) closeCreateModal();
      });
    }
    // Escape key to close when open
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && createPostModal && createPostModal.style.display !== 'none' && createPostModal.style.display !== '') {
        closeCreateModal();
      }
    });
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

    // Delegate comment send and lazy-load comments on focus
    postsList.addEventListener('click', async (e) => {
      const btn = e.target.closest('.comment-send');
      if (!btn) return;
      const card = e.target.closest('article.game-card');
      if (!card) return;
      const postId = card.getAttribute('data-id');
      const wrap = card.querySelector(`#comments-${postId}`);
      const input = wrap?.querySelector('input');
      const text = (input?.value || '').trim();
      if (!text) return;
      if (!auth || !auth.currentUser) { alert('Please sign in to reply.'); return; }
      try {
        const f = await ensureModFirestore();
        await mfs.addDoc(
          mfs.collection(mfs.db, `community_posts/${postId}/comments`),
          {
            body: text,
            userId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName || (auth.currentUser.email?.split('@')[0]) || 'Anonymous',
            authorPhotoUrl: auth.currentUser.photoURL || '',
            createdAt: mfs.Timestamp.fromDate(new Date()),
            likesCount: 0
          }
        );
        input.value = '';
        // reload comments
        await loadCommentsFor(postId, wrap.querySelector('.comments-list'));
      } catch (err) {
        console.error('Add comment failed:', err);
        alert('Failed to add reply.');
      }
    });

    postsList.addEventListener('focusin', async (e) => {
      const input = e.target.closest('.comment-compose input');
      if (!input) return;
      const card = e.target.closest('article.game-card');
      if (!card) return;
      const postId = card.getAttribute('data-id');
      const list = card.querySelector(`#comments-${postId} .comments-list`);
      if (list && list.dataset.loaded !== '1') {
        await loadCommentsFor(postId, list);
      }
    });
  });

  async function loadCommentsFor(postId, listEl){
    try {
      const f = await ensureModFirestore();
      const q = f.query(
        f.collection(f.db, `community_posts/${postId}/comments`),
        f.orderBy('createdAt','desc'),
        f.limit(5)
      );
      const snap = await f.getDocs(q);
      const items = [];
      snap.forEach(doc => {
        const c = doc.data();
        const when = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : '';
        const who = escapeHtml(c.authorName || 'Anonymous');
        items.push(`<div class="comment-item" style="display:flex; gap:8px; align-items:flex-start;">
          <img src="${escapeHtml(c.authorPhotoUrl || '')}" alt="" onerror="this.style.display='none'" style="width:24px;height:24px;border-radius:50%;border:1px solid var(--primary-cyan);object-fit:cover;" />
          <div style="flex:1;">
            <div style="font-size:0.85rem; opacity:0.9;"><strong>${who}</strong> · <span style="opacity:0.7;">${when}</span></div>
            <div style="font-size:0.95rem;">${escapeHtml(c.body)}</div>
          </div>
        </div>`);
      });
      listEl.innerHTML = items.join('');
      listEl.dataset.loaded = '1';
    } catch (e) {
      console.error('Load comments failed:', e);
    }
  }
})();
