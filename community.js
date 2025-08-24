// Community page logic: list posts, create post modal, basic filters
(function(){
  const auth = window.firebaseAuth;
  // Role UIDs (keep in sync with firestore.rules isDeveloper + extend for artists as needed)
  const ROLE_UIDS = {
    developers: new Set([
      '6iZDTXC78aVwX22qrY43BOxDRLt1',
      'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
      'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
      '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
      'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
    ]),
    artists: new Set([
      'cuGtyQvqilcWmxS859eta41Plak2'
    ])
  };

  function roleBadgesFor(uid){
    if (!uid) return '';
    const out = [];
    if (ROLE_UIDS.developers.has(uid)) out.push('<span class="role-badge dev" title="Developer">DEV</span>');
    if (ROLE_UIDS.artists.has(uid)) out.push('<span class="role-badge artist" title="Artist">ART</span>');
    return out.join(' ');
  }
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
  deleteDoc: null,
  doc: null,
  updateDoc: null,
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
  const { getFirestore, collection, query, where, orderBy, startAfter, limit, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp } = mod;
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
  mfs.deleteDoc = deleteDoc;
  mfs.doc = doc;
  mfs.updateDoc = updateDoc;
    mfs.Timestamp = Timestamp;
    return mfs;
  }

  function postCard(doc){
    const d = doc.data();
    const tags = (d.tags || []).map(t => `<span class="tag">#${escapeHtml(String(t))}</span>`).join(' ');
    const likes = d.likesCount || 0;
    const date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();
    const author = escapeHtml(d.userDisplayName || d.userName || d.authorName || 'Anonymous');
    const avatar = escapeHtml(d.authorPhotoUrl || 'assets/icons/anonymous.png');
  const fullBody = String(d.body || '');
  const truncLen = 220;
  const isTruncated = fullBody.length > truncLen;
  const truncated = fullBody.slice(0, truncLen);
    return `
      <article class="game-card community-card" data-id="${doc.id}" data-owner="${escapeHtml(d.userId || '')}">
        <div class="card-content">
          <div class="post-header-row">
            <h3 class="card-title">${escapeHtml(d.title || 'Untitled')}</h3>
            <div class="post-actions"></div>
          </div>
          <p class="card-description" data-trunc-len="${truncLen}" data-full-uri="${encodeURIComponent(fullBody)}" data-state="truncated">${escapeHtml(truncated)}${isTruncated ? '… <button class="read-toggle link" type="button" aria-expanded="false" aria-label="Read full post">Read more</button>' : ''}</p>
          <div class="card-tags">${tags}</div>
          <div class="card-meta community-meta">
            <img class="author-avatar" src="${avatar}" alt="" loading="lazy" decoding="async" onerror="this.src='assets/icons/anonymous.png'" />
            <span class="author-name" title="Author">${author}</span>
            ${roleBadgesFor(d.userId)}
            <span class="meta-dot">•</span>
            <span class="meta-date" title="Date">${date.toLocaleDateString()}</span>
            <span class="spacer"></span>
            <span class="meta-likes" title="Likes">❤ ${likes}</span>
          </div>
          <div class="comments" id="comments-${doc.id}">
            <div class="comments-list" data-loaded="0"></div>
            <div class="comment-compose">
              <input type="text" class="neural-input comment-input" placeholder="Write a reply..." />
              <button class="neural-button comment-send"><span class="button-text">Reply</span></button>
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

    // Auto-load the latest comments so action buttons are visible
    requestAnimationFrame(() => {
      const cards = postsList.querySelectorAll('article.game-card');
      cards.forEach(card => {
        const postId = card.getAttribute('data-id');
        const list = card.querySelector(`#comments-${postId} .comments-list`);
        if (list && list.dataset.loaded !== '1') {
          loadCommentsFor(postId, list);
        }
      });
  refreshOwnerPostActions();
    });
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
  requestAnimationFrame(() => refreshOwnerPostActions());
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

    // One-time community announcement toast
    try {
      if (!localStorage.getItem('gr.community.announce.v1')) {
        showCommunityAnnouncement();
        localStorage.setItem('gr.community.announce.v1', '1');
      }
    } catch (e) {}

    // Hide create button when signed out
    if (auth) {
      auth.onAuthStateChanged((u)=>{
        if (createBtn) {
          createBtn.style.display = u ? 'inline-flex' : 'none';
        }
    // Toggle post owner actions on auth change
    refreshOwnerPostActions();
  // no-op; index-builder UI removed
      });
    }

    // Delegate comment send and lazy-load comments on focus
    postsList.addEventListener('click', async (e) => {
      // Read more / less toggle
  const toggle = e.target.closest('.read-toggle');
      if (toggle) {
        const card = e.target.closest('article.game-card');
        const desc = card?.querySelector('.card-description');
        if (desc) {
          const state = desc.getAttribute('data-state') || 'truncated';
          const fullUri = desc.getAttribute('data-full-uri') || '';
          const truncLen = parseInt(desc.getAttribute('data-trunc-len') || '220', 10);
          try {
            const full = decodeURIComponent(fullUri);
            if (state === 'truncated') {
      // Expand with inline Read less
      desc.innerHTML = `${escapeHtml(full)} <button class="read-toggle link" type="button" aria-expanded="true" aria-label="Collapse post">Read less</button>`;
      desc.setAttribute('data-state', 'expanded');
            } else {
      const short = full.slice(0, truncLen);
      desc.innerHTML = `${escapeHtml(short)}${full.length > truncLen ? '… <button class="read-toggle link" type="button" aria-expanded="false" aria-label="Read full post">Read more</button>' : ''}`;
      desc.setAttribute('data-state', 'truncated');
            }
          } catch (err) {
            console.warn('Toggle read failed:', err);
          }
        }
        return; // don't fall through to comment handlers
      }

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

    // Delegate comment delete
    postsList.addEventListener('click', async (e) => {
      const del = e.target.closest('.comment-delete');
      if (!del) return;
      const card = e.target.closest('article.game-card');
      if (!card) return;
      if (!auth || !auth.currentUser) { alert('You must be signed in.'); return; }
      const postId = card.getAttribute('data-id');
      const commentId = del.getAttribute('data-cid');
      const confirmMsg = 'Delete this comment? This cannot be undone.';
      if (!commentId || !confirm(confirmMsg)) return;
      try {
        const f = await ensureModFirestore();
        await mfs.deleteDoc(mfs.doc(mfs.db, `community_posts/${postId}/comments/${commentId}`));
        const list = card.querySelector(`#comments-${postId} .comments-list`);
        await loadCommentsFor(postId, list);
      } catch (err) {
        console.error('Delete comment failed:', err);
        alert('Failed to delete comment.');
      }
    });

    // Delegate comment edit start
    postsList.addEventListener('click', async (e) => {
      const edit = e.target.closest('.comment-edit');
      if (!edit) return;
      const item = e.target.closest('.comment-item');
      if (!item) return;
      const bodyEl = item.querySelector('.comment-body');
      if (!bodyEl || item.classList.contains('editing')) return;
      const original = bodyEl.textContent;
      item.dataset.original = original;
      item.classList.add('editing');
      bodyEl.innerHTML = `<textarea class="comment-edit-input neural-input" rows="2">${escapeHtml(original)}</textarea>`;
      const actions = item.querySelector('.comment-actions');
      if (actions) actions.innerHTML = `
        <button class="comment-save">Save</button>
        <button class="comment-cancel">Cancel</button>
      `;
    });

    // Delegate comment edit cancel
    postsList.addEventListener('click', (e) => {
      const cancel = e.target.closest('.comment-cancel');
      if (!cancel) return;
      const item = e.target.closest('.comment-item');
      const bodyEl = item?.querySelector('.comment-body');
      if (!item || !bodyEl) return;
      bodyEl.textContent = item.dataset.original || '';
      const actions = item.querySelector('.comment-actions');
      if (actions) actions.innerHTML = actions.dataset.template || '';
      item.classList.remove('editing');
    });

    // Delegate comment edit save
    postsList.addEventListener('click', async (e) => {
      const save = e.target.closest('.comment-save');
      if (!save) return;
      const item = e.target.closest('.comment-item');
      if (!item) return;
      const card = e.target.closest('article.game-card');
      const postId = card?.getAttribute('data-id');
      const commentId = item?.getAttribute('data-cid');
      const input = item.querySelector('.comment-edit-input');
      const newText = (input?.value || '').trim();
      if (!newText || !postId || !commentId) return;
      if (!auth || !auth.currentUser) { alert('You must be signed in.'); return; }
      try {
        const f = await ensureModFirestore();
        await mfs.updateDoc(mfs.doc(mfs.db, `community_posts/${postId}/comments/${commentId}`), {
          body: newText,
          updatedAt: mfs.Timestamp.fromDate(new Date())
        });
        const list = card.querySelector(`#comments-${postId} .comments-list`);
        await loadCommentsFor(postId, list);
      } catch (err) {
        console.error('Save comment failed:', err);
        alert('Failed to save changes.');
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

  // Show a dismissible toast announcing the community page
  function showCommunityAnnouncement(){
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 20px; right: -420px; width: 360px; max-width: calc(100vw - 24px);
      background: linear-gradient(145deg, rgba(22, 225, 255, 0.12), rgba(255, 46, 166, 0.12));
      border: 2px solid rgba(22, 225, 255, 0.7);
      border-radius: 14px; padding: 0; z-index: 10000; backdrop-filter: blur(10px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.35), 0 0 20px rgba(22,225,255,0.2);
      transition: right 450ms cubic-bezier(0.4, 0, 0.2, 1);
      color: #e8f8ff; font-family: 'Rajdhani', system-ui, sans-serif;
    `;
    toast.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:.75rem; padding:1rem;">
        <div style="font-size:1.4rem; line-height:1; filter: drop-shadow(0 0 6px rgba(0,255,249,0.4));">✨</div>
        <div style="flex:1;">
          <strong style="display:block; font-family:'Orbitron', monospace; letter-spacing:.6px; margin-bottom:.2rem; text-shadow:0 0 10px rgba(0,255,249,0.4);">Community is live!</strong>
          <p style="margin:.1rem 0 0; opacity:.9;">Create posts, share updates, and reply to others. Be respectful and have fun.</p>
        </div>
        <button aria-label="Dismiss" style="background:none;border:none;color:#16e1ff;font-size:1.2rem;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:8px;">
          ×
        </button>
      </div>
    `;
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(()=>{ toast.style.right = '20px'; }, 60);
    // Auto-hide after 8s
    setTimeout(()=>{ try { if (toast && toast.parentNode) toast.remove(); } catch(e){} }, 8000);
  }

  function refreshOwnerPostActions(){
    const uid = auth && auth.currentUser ? auth.currentUser.uid : null;
    const cards = postsList.querySelectorAll('article.game-card');
    cards.forEach(card => {
      const owner = card.getAttribute('data-owner');
      const ctr = card.querySelector('.post-actions');
      if (!ctr) return;
      if (uid && owner === uid) {
        if (!ctr.dataset.bound) {
          ctr.innerHTML = '<button class="post-edit">Edit</button><button class="post-delete">Delete</button>';
          ctr.dataset.bound = '1';
        }
      } else {
        ctr.innerHTML = '';
        delete ctr.dataset.bound;
      }
    });
  }

  // Post actions (owner only)
  postsList.addEventListener('click', async (e) => {
    const del = e.target.closest('.post-delete');
    if (!del) return;
    const card = e.target.closest('article.game-card');
    if (!card) return;
    const owner = card.getAttribute('data-owner');
    if (!auth || !auth.currentUser || auth.currentUser.uid !== owner) return;
    const postId = card.getAttribute('data-id');
    if (!postId || !confirm('Delete this post? This cannot be undone.')) return;
    try {
      await ensureModFirestore();
      await mfs.deleteDoc(mfs.doc(mfs.db, `community_posts/${postId}`));
      lastCursor = null; postsList.innerHTML = ''; await loadPosts(true);
    } catch (err) {
      console.error('Delete post failed:', err);
      alert('Failed to delete post.');
    }
  });

  postsList.addEventListener('click', async (e) => {
    const edit = e.target.closest('.post-edit');
    if (!edit) return;
    const card = e.target.closest('article.game-card');
    if (!card) return;
    const owner = card.getAttribute('data-owner');
    if (!auth || !auth.currentUser || auth.currentUser.uid !== owner) return;
    const titleEl = card.querySelector('.card-title');
    const descEl = card.querySelector('.card-description');
    const oldTitle = titleEl?.textContent || '';
    const oldBody = descEl?.textContent?.replace(/…$/, '') || '';
    const newTitle = prompt('Edit title:', oldTitle);
    if (newTitle == null) return;
    const newBody = prompt('Edit body:', oldBody);
    if (newBody == null) return;
    try {
      await ensureModFirestore();
      const postId = card.getAttribute('data-id');
      await mfs.updateDoc(mfs.doc(mfs.db, `community_posts/${postId}`), {
        title: String(newTitle).trim(),
        body: String(newBody).trim(),
        updatedAt: mfs.Timestamp.fromDate(new Date())
      });
      lastCursor = null; postsList.innerHTML = ''; await loadPosts(true);
    } catch (err) {
      console.error('Edit post failed:', err);
      alert('Failed to save changes.');
    }
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
        const canOwn = !!(auth && auth.currentUser && c.userId === auth.currentUser.uid);
    const actionsTpl = canOwn ? `<div class="comment-actions" data-template="<div class=\"comment-actions\"><button class=\"comment-edit\" data-cid=\"${doc.id}\">Edit<\/button><button class=\"comment-delete\" data-cid=\"${doc.id}\">Delete<\/button><\/div>"><button class="comment-edit" data-cid="${doc.id}">Edit</button><button class="comment-delete" data-cid="${doc.id}">Delete</button></div>` : '<div class="comment-actions"></div>';
        items.push(`<div class="comment-item" data-cid="${doc.id}">
          <img class="comment-avatar" src="${escapeHtml(c.authorPhotoUrl || '')}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'" />
          <div class="comment-main">
      <div class="comment-head"><strong>${who}</strong> ${roleBadgesFor(c.userId)} <span class="comment-when">${when}</span></div>
            <div class="comment-body">${escapeHtml(c.body)}</div>
          </div>
          ${actionsTpl}
        </div>`);
      });
      listEl.innerHTML = items.join('');
      listEl.dataset.loaded = '1';
    } catch (e) {
      console.error('Load comments failed:', e);
    }
  }
})();
