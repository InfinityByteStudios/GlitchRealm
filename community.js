// Community page logic: list posts, create post modal, basic filters
(function(){
  const auth = window.firebaseAuth;
  let currentUser = null;
  let isAdmin = false;
  let isMod = false; // admins or developer UIDs can access moderation panel
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
    getDoc: null,
    setDoc: null,
    increment: null,
    onSnapshot: null,
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
  // Track hidden posts for the signed-in user
  const hiddenPosts = new Set();
  let hiddenUnsub = null;

  async function ensureModFirestore(){
    if (mfs.db) return mfs;
    const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const { getFirestore, collection, query, where, orderBy, startAfter, limit, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp, getDoc, setDoc, increment, onSnapshot } = mod;
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
  mfs.getDoc = getDoc;
  mfs.setDoc = setDoc;
  mfs.increment = increment;
    mfs.onSnapshot = onSnapshot;
    mfs.Timestamp = Timestamp;
    return mfs;
  }

  // Realtime management
  const cardListeners = new Map(); // postId -> unsubscribe
  let newPostsUnsub = null;
  let latestTopCreatedAt = null; // Date

  function clearCardListeners(){
    for (const unsub of cardListeners.values()) {
      try { unsub && unsub(); } catch(e) {}
    }
    cardListeners.clear();
  }
  function clearNewPostsListener(){
    try { newPostsUnsub && newPostsUnsub(); } catch(e) {}
    newPostsUnsub = null;
  }

  function postCard(doc){
    const d = doc.data();
  const pinned = !!d.pinned;
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
      <article class="game-card community-card${pinned ? ' pinned' : ''}" data-id="${doc.id}" data-owner="${escapeHtml(d.userId || '')}" data-pinned="${pinned ? '1' : '0'}">
        <div class="card-content">
          <div class="post-header-row">
            <h3 class="card-title">${escapeHtml(d.title || 'Untitled')}</h3>
      <div class="post-actions">
              ${pinned ? '<span class="pin-chip" title="Pinned">📌</span>' : ''}
              <button class="post-menu-btn" aria-haspopup="menu" aria-expanded="false" title="Actions">⋯</button>
              <div class="post-menu" role="menu" aria-hidden="true" style="display:none;">
                <button class="menu-item report" role="menuitem">Report</button>
                <button class="menu-item hide" role="menuitem">Hide</button>
                <button class="menu-item pin admin-only" role="menuitem" style="display:none;">Pin</button>
                <button class="menu-item unpin admin-only" role="menuitem" style="display:none;">Unpin</button>
                <button class="menu-item delete admin-only" role="menuitem" style="display:none; color:#ff6b6b;">Delete</button>
              </div>
            </div>
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
            <span class="meta-likes" role="button" tabindex="0" aria-pressed="false" title="Upvotes">▲ <span class="like-count">${likes}</span></span>
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
    if (reset) {
      postsList.innerHTML = '';
      clearCardListeners();
      clearNewPostsListener();
    }
  if (snap.empty && (reset || postsList.children.length === 0)) {
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
    }
  // Build array, filter hidden posts, and sort pinned first (stable)
  let docs = snap.docs.slice();
  docs = docs.filter(d => !hiddenPosts.has(d.id));
  docs.sort((a,b) => ((b.data().pinned?1:0) - (a.data().pinned?1:0)));
  const items = docs.map(d => postCard(d));
    postsList.insertAdjacentHTML('beforeend', items.join(''));
    lastCursor = snap.docs[snap.docs.length - 1] || null;
    loadMoreBtn.style.display = snap.size === pageSize ? 'inline-flex' : 'none';

    // Track latest top for new post listener (only on reset, use first doc)
    if (reset && snap.docs.length > 0) {
      const top = snap.docs[0];
      const ts = top.data().createdAt?.toDate ? top.data().createdAt.toDate() : new Date();
      latestTopCreatedAt = ts;
      setupNewPostsListener();
    }

    // Auto-load the latest comments so action buttons are visible
    requestAnimationFrame(() => {
      const cards = postsList.querySelectorAll('article.game-card');
      cards.forEach(card => {
        const postId = card.getAttribute('data-id');
        const list = card.querySelector(`#comments-${postId} .comments-list`);
        if (list && list.dataset.loaded !== '1') {
          loadCommentsFor(postId, list);
        }
  // Mark upvote state for current user
  markUpvoteState(card, postId);
        // Subscribe to realtime updates for likesCount for this post
        ensurePostDocListener(card, postId);
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
  // Filter hidden posts
  docs = docs.filter(x => !hiddenPosts.has(x.ref.id));
  // Pinned first
  docs.sort((a,b) => ((b.data.pinned?1:0) - (a.data.pinned?1:0)));
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
  requestAnimationFrame(() => {
        const cards = postsList.querySelectorAll('article.game-card');
        cards.forEach(card => {
          const postId = card.getAttribute('data-id');
          markUpvoteState(card, postId);
          ensurePostDocListener(card, postId);
        });
        refreshOwnerPostActions();
      });

      // Track latest top for new post listener (only on reset)
      if (reset && snap.docs.length > 0) {
        const top = snap.docs[0];
        const ts = top.data().createdAt?.toDate ? top.data().createdAt.toDate() : new Date();
        latestTopCreatedAt = ts;
        setupNewPostsListener();
      }
    } catch (e) {
      console.error('Fallback load failed:', e);
      if (reset) postsList.innerHTML = '';
      emptyEl.style.display = 'block';
      loadMoreBtn.style.display = 'none';
    }
  }

  function ensurePostDocListener(card, postId){
    if (cardListeners.has(postId)) return;
    (async () => {
      try {
        await ensureModFirestore();
        const ref = mfs.doc(mfs.db, `community_posts/${postId}`);
        const unsub = mfs.onSnapshot(ref, (docSnap) => {
          if (!docSnap.exists()) return;
          const data = docSnap.data();
          const likeEl = card.querySelector('.meta-likes .like-count');
          if (likeEl) {
            const newCount = data.likesCount || 0;
            if (String(likeEl.textContent) !== String(newCount)) likeEl.textContent = newCount;
          }
        });
        cardListeners.set(postId, unsub);
      } catch(e) { /* non-fatal */ }
    })();
  }

  function setupNewPostsListener(){
    if (!latestTopCreatedAt) return;
    (async () => {
      try {
        const f = await ensureModFirestore();
        // Listen only for newer posts matching current filter
        let q = f.query(
          f.collection(f.db, 'community_posts'),
          f.where('status','==','published'),
          f.where('createdAt','>', f.Timestamp.fromDate(latestTopCreatedAt)),
          f.orderBy('createdAt','desc')
        );
        const tag = filterTag.value.trim();
        if (tag) {
          // Firestore requires where before orderBy; already done
          q = f.query(q, f.where('tags','array-contains', tag));
        }
        clearNewPostsListener();
        let pending = 0;
        const banner = getOrCreateNewPostsBanner();
        banner.style.display = 'none';
        newPostsUnsub = f.onSnapshot(q, (snap) => {
          snap.docChanges().forEach(ch => {
            if (ch.type === 'added') pending++;
          });
          if (pending > 0) {
            banner.querySelector('.np-label').textContent = `${pending} new post${pending>1?'s':''}`;
            banner.style.display = 'inline-flex';
          }
        });
      } catch(e) { /* ignore */ }
    })();
  }

  function getOrCreateNewPostsBanner(){
    let el = document.getElementById('new-posts-banner');
    if (el) return el;
    el = document.createElement('button');
    el.id = 'new-posts-banner';
    el.className = 'neural-button secondary';
    el.style.cssText = 'display:none; margin: 0 0 12px 0;';
    el.innerHTML = '<span class="np-label">New posts</span>';
    el.addEventListener('click', () => {
      // Reload to include new posts
      latestTopCreatedAt = null;
      clearNewPostsListener();
      lastCursor = null;
      loadPosts(true);
      el.style.display = 'none';
      el.querySelector('.np-label').textContent = 'New posts';
    });
    const toolbar = document.querySelector('.community-toolbar');
    if (toolbar && toolbar.parentElement) toolbar.parentElement.insertBefore(el, toolbar.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
    return el;
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
  // Wire report modal controls
    const reportModal = document.getElementById('report-post-modal');
    const closeReportBtn = document.getElementById('close-report-post');
    const cancelReportBtn = document.getElementById('cancel-report');
    const reportForm = document.getElementById('report-post-form');
    let reportTargetPostId = null;
    function openReportModal(postId){
      reportTargetPostId = postId;
      if (reportModal) {
        reportModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    }
    function closeReportModal(){
      if (!reportModal) return;
      reportTargetPostId = null;
      // reset selections
      try {
        reportForm?.reset();
      } catch(e){}
      reportModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
    closeReportBtn?.addEventListener('click', (e)=>{ e.preventDefault(); closeReportModal(); });
    cancelReportBtn?.addEventListener('click', (e)=>{ e.preventDefault(); closeReportModal(); });
    reportModal?.addEventListener('click', (e)=>{ if (e.target === reportModal) closeReportModal(); });
    reportForm?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if (!auth || !auth.currentUser) { alert('Please sign in to report.'); return; }
      if (!reportTargetPostId) { alert('No post selected.'); return; }
      try {
        await ensureModFirestore();
        const reason = (document.querySelector('input[name="report-reason"]:checked')?.value || 'Other').slice(0, 60);
        const details = String(document.getElementById('report-details')?.value || '').slice(0, 500);
        const owner = (postsList.querySelector(`article.game-card[data-id="${CSS.escape(reportTargetPostId)}"]`)?.getAttribute('data-owner')) || '';
        await mfs.addDoc(mfs.collection(mfs.db, 'community_post_reports'), {
          postId: reportTargetPostId,
          userId: auth.currentUser.uid,
          reason: reason + (details ? `: ${details}` : ''),
          status: 'open',
          createdAt: mfs.Timestamp.fromDate(new Date()),
          // store extra but not required by rules (won't block):
          postOwnerId: owner
        });
        closeReportModal();
        alert('Report submitted.');
      } catch (err) {
        console.error('Submit report failed:', err);
        alert('Failed to submit report.');
      }
    });
    filterTag && filterTag.addEventListener('change', ()=>loadPosts(true));
    sortOrder && sortOrder.addEventListener('change', ()=>loadPosts(true));
    loadMoreBtn && loadMoreBtn.addEventListener('click', ()=>loadPosts(false));
  // Moderation toolbar button
  const modBtn = document.getElementById('moderation-btn');
  modBtn?.addEventListener('click', (e)=>{ e.preventDefault(); if (isMod) { window.openModPanel(); } });
    // Initial load
    loadPosts(true);
    // If navigated with ?focus=<postId>, try to highlight that post once loaded
    try {
      const params = new URLSearchParams(location.search);
      const focusId = params.get('focus');
      if (focusId) {
        const tryFocus = () => {
          const el = document.querySelector(`article.game-card[data-id="${CSS.escape(focusId)}"]`);
          if (el) {
            el.classList.add('mod-highlight');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(()=>{ try { el.classList.remove('mod-highlight'); } catch(e){} }, 1600);
            return true;
          }
          return false;
        };
        // Try immediately and again shortly after
        setTimeout(tryFocus, 400);
        setTimeout(tryFocus, 1000);
      }
    } catch(e) {}

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
        currentUser = u;
        // Track hidden posts collection for this user
        if (hiddenUnsub) { try { hiddenUnsub(); } catch(e){} hiddenUnsub = null; }
        hiddenPosts.clear();
        if (u) {
          ensureModFirestore().then(() => {
            const hp = mfs.collection(mfs.db, `users/${u.uid}/hidden_posts`);
            hiddenUnsub = mfs.onSnapshot(hp, (snap) => {
              hiddenPosts.clear();
              snap.forEach(d => hiddenPosts.add(d.id));
              // Refresh list to apply filtering
              lastCursor = null; loadPosts(true);
            });
          });
          // Determine admin via custom claims if available
          try {
            u.getIdTokenResult().then(t => {
              isAdmin = !!t.claims?.admin;
              isMod = isAdmin || ROLE_UIDS.developers.has(u.uid);
              refreshAdminMenus();
              try { const mb = document.getElementById('moderation-btn'); if (mb) mb.style.display = isMod ? 'inline-flex' : 'none'; } catch(e){}
            }).catch(()=>{ isAdmin=false; isMod = ROLE_UIDS.developers.has(u.uid); refreshAdminMenus(); });
          } catch(e) { isAdmin=false; refreshAdminMenus(); }
        } else {
          isAdmin = false; isMod = false; refreshAdminMenus();
          try { const mb = document.getElementById('moderation-btn'); if (mb) mb.style.display = 'none'; } catch(e){}
        }
        // Toggle post owner actions on auth change
        refreshOwnerPostActions();
  // no-op; index-builder UI removed
      });
    }

    // Delegate upvote toggle, comment send and lazy-load comments on focus
    postsList.addEventListener('click', async (e) => {
      // Upvote toggle
      const likeEl = e.target.closest('.meta-likes');
      if (likeEl) {
        const card = likeEl.closest('article.game-card');
        const postId = card?.getAttribute('data-id');
        const countEl = likeEl.querySelector('.like-count');
        if (!postId || !countEl) return;
        if (!auth || !auth.currentUser) { alert('Please sign in to upvote.'); return; }
        try {
          const f = await ensureModFirestore();
          const uid = auth.currentUser.uid;
          const likeDocRef = mfs.doc(mfs.db, `community_posts/${postId}/likes/${uid}`);
          const snap = await mfs.getDoc(likeDocRef);
          const postRef = mfs.doc(mfs.db, `community_posts/${postId}`);
          const current = parseInt(countEl.textContent || '0', 10) || 0;
          if (snap.exists()) {
            // Remove like
            await mfs.deleteDoc(likeDocRef);
            await mfs.updateDoc(postRef, { likesCount: mfs.increment(-1) });
            countEl.textContent = Math.max(0, current - 1);
            likeEl.setAttribute('aria-pressed', 'false');
          } else {
            await mfs.setDoc(likeDocRef, { userId: uid, createdAt: mfs.Timestamp.fromDate(new Date()) });
            await mfs.updateDoc(postRef, { likesCount: mfs.increment(1) });
            countEl.textContent = current + 1;
            likeEl.setAttribute('aria-pressed', 'true');
          }
        } catch (err) {
          console.error('Toggle upvote failed:', err);
          alert('Failed to toggle upvote.');
        }
        return;
      }

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

      // Post menu open/close
      const menuBtn = e.target.closest('.post-menu-btn');
      if (menuBtn) {
        const actions = menuBtn.closest('.post-actions');
        const menu = actions?.querySelector('.post-menu');
        if (menu) {
          const open = menu.style.display !== 'block';
          closeAllMenus();
          menu.style.display = open ? 'block' : 'none';
          menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
          menu.setAttribute('aria-hidden', open ? 'false' : 'true');
          // Gate admin items visibility
          menu.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
          });
          // Gate moderator items visibility (admins or developers)
          menu.querySelectorAll('.mod-only').forEach(el => {
            el.style.display = isMod ? 'block' : 'none';
          });
        }
        return;
      }

      // Menu actions: report, hide, pin/unpin, delete
      const reportBtn = e.target.closest('.menu-item.report');
      const hideBtn = e.target.closest('.menu-item.hide');
      const pinBtn = e.target.closest('.menu-item.pin');
      const unpinBtn = e.target.closest('.menu-item.unpin');
      const adminDeleteBtn = e.target.closest('.menu-item.delete');
      if (reportBtn || hideBtn || pinBtn || unpinBtn || adminDeleteBtn) {
        const card = e.target.closest('article.game-card');
        const postId = card?.getAttribute('data-id');
        if (!postId) return;
        closeAllMenus();
  if (reportBtn) { openReportModal(postId); return; }
        if (hideBtn) { handleHide(postId, card); return; }
        if (pinBtn) { handlePin(postId, card, true); return; }
        if (unpinBtn) { handlePin(postId, card, false); return; }
        if (adminDeleteBtn) { handleAdminDelete(postId, card); return; }
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

    // Keyboard support for upvote (Enter/Space)
    postsList.addEventListener('keydown', async (e) => {
      const likeEl = e.target.closest('.meta-likes');
      if (!likeEl) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      likeEl.click();
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

    // Close menus on outside click
    document.addEventListener('click', (ev) => {
      if (!ev.target.closest('.post-actions')) closeAllMenus();
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
      const menu = ctr.querySelector('.post-menu');
      if (uid && owner === uid) {
        if (menu && !menu.dataset.ownerBound) {
          // Append owner actions into menu
          const edit = document.createElement('button');
          edit.className = 'menu-item post-edit';
          edit.setAttribute('role','menuitem');
          edit.textContent = 'Edit';
          const del = document.createElement('button');
          del.className = 'menu-item post-delete';
          del.setAttribute('role','menuitem');
          del.textContent = 'Delete';
          menu.appendChild(edit);
          menu.appendChild(del);
          menu.dataset.ownerBound = '1';
        }
      } else {
        if (menu && menu.dataset.ownerBound) {
          // Remove previously added owner items
          menu.querySelectorAll('.menu-item.post-edit, .menu-item.post-delete').forEach(n => n.remove());
          delete menu.dataset.ownerBound;
        }
      }
    });
  }

  function refreshAdminMenus(){
    try {
      document.querySelectorAll('.post-menu').forEach(menu => {
        menu.querySelectorAll('.admin-only').forEach(el => {
          el.style.display = isAdmin ? 'block' : 'none';
        });
      });
    } catch(e){}
  }

  function closeAllMenus(){
    document.querySelectorAll('.post-menu').forEach(m => { m.style.display = 'none'; m.setAttribute('aria-hidden','true'); });
    document.querySelectorAll('.post-menu-btn').forEach(b => b.setAttribute('aria-expanded','false'));
  }

  async function handleReport(postId, card){
  // Legacy path unused; modal now handles reporting
  }

  async function handleHide(postId, card){
    if (!auth || !auth.currentUser) { alert('Please sign in to hide posts.'); return; }
    try {
      await ensureModFirestore();
      const ref = mfs.doc(mfs.db, `users/${auth.currentUser.uid}/hidden_posts/${postId}`);
  await mfs.setDoc(ref, { hiddenAt: mfs.Timestamp.fromDate(new Date()) });
      hiddenPosts.add(postId);
      card.style.display = 'none';
    } catch(e){ console.error('Hide failed', e); alert('Failed to hide.'); }
  }

  async function handlePin(postId, card, pinned){
    if (!isAdmin) { alert('Admin only.'); return; }
    try {
      await ensureModFirestore();
      const ref = mfs.doc(mfs.db, `community_posts/${postId}`);
  // Admin may only toggle the 'pinned' field per rules
  await mfs.updateDoc(ref, { pinned: !!pinned });
      card.dataset.pinned = pinned ? '1' : '0';
      if (pinned) card.classList.add('pinned'); else card.classList.remove('pinned');
    } catch(e){ console.error('Pin failed', e); alert('Failed to update pin.'); }
  }

  async function handleAdminDelete(postId, card){
    if (!isAdmin) { alert('Admin only.'); return; }
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await ensureModFirestore();
      await mfs.deleteDoc(mfs.doc(mfs.db, `community_posts/${postId}`));
      card.remove();
    } catch(e){ console.error('Admin delete failed', e); alert('Failed to delete.'); }
  }

  async function markUpvoteState(card, postId){
    try {
      if (!auth || !auth.currentUser) return;
      const likeEl = card.querySelector('.meta-likes');
      if (!likeEl) return;
      const uid = auth.currentUser.uid;
      await ensureModFirestore();
      const likeDocRef = mfs.doc(mfs.db, `community_posts/${postId}/likes/${uid}`);
      const snap = await mfs.getDoc(likeDocRef);
      likeEl.setAttribute('aria-pressed', snap.exists() ? 'true' : 'false');
    } catch (e) {
      // Non-fatal
    }
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

// Moderation panel (reports list)
(function(){
  let reportsUnsub = null;
  const listId = 'mod-reports-list';
  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }
  function renderReportsList(snap){
    const list = document.getElementById(listId);
    if (!list) return;
    if (!snap || snap.empty) { list.innerHTML = '<div style="opacity:.8; padding:8px;">No reports found.</div>'; return; }
    const rows = [];
    snap.forEach(d => {
      const r = d.data();
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const reason = (r.reason || '').toString();
      const status = (r.status || 'open');
      const postId = r.postId || '';
      rows.push(`<div class="mod-report-row">
        <div class="mrr-main">
          <div class="mrr-title">${esc(reason)}</div>
          <div class="mrr-meta">Status: <strong>${esc(status)}</strong> • Post: <code>${esc(postId)}</code> • ${esc(when)}</div>
        </div>
        <div class="mrr-actions">
          <button class="neural-button secondary mrr-copy" data-pid="${esc(postId)}"><span class="button-text">Copy ID</span></button>
          <button class="neural-button secondary mrr-open" data-pid="${esc(postId)}"><span class="button-text">View post</span></button>
        </div>
      </div>`);
    });
    list.innerHTML = rows.join('');
  }

  async function ensureReportsListener(){
    try {
      const auth = window.firebaseAuth;
      if (!auth || !auth.currentUser) return;
      const uid = auth.currentUser.uid;
      // Only open if user is admin or dev (UI already gates, this is defense-in-depth)
      const isDev = new Set([
        '6iZDTXC78aVwX22qrY43BOxDRLt1',
        'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
        'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
        '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
        'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
      ]).has(uid);
      let isAdmin = false;
      try { const t = await auth.currentUser.getIdTokenResult(); isAdmin = !!t.claims?.admin; } catch(e){}
      if (!isDev && !isAdmin) return;
      const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const { getFirestore, collection, query, orderBy, limit, onSnapshot } = mod;
      const db = getFirestore();
      const q = query(collection(db, 'community_post_reports'), orderBy('createdAt','desc'), limit(50));
      if (reportsUnsub) { try { reportsUnsub(); } catch(e){} reportsUnsub = null; }
      reportsUnsub = onSnapshot(q, (snap) => renderReportsList(snap));
    } catch(e){ /* no-op */ }
  }

  function tryFocusPost(pid){
    if (!pid) return;
    const el = document.querySelector(`article.game-card[data-id="${CSS.escape(pid)}"]`);
    if (el) {
      el.classList.add('mod-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(()=>{ try { el.classList.remove('mod-highlight'); } catch(e){} }, 1600);
    } else {
      alert('Post not on this page. Try Load more or change filters.');
    }
  }

  function wireListActions(){
    const host = document.getElementById('mod-reports-modal');
    if (!host) return;
    host.addEventListener('click', (e)=>{
      const copy = e.target.closest('.mrr-copy');
      const open = e.target.closest('.mrr-open');
      if (copy) {
        const pid = copy.getAttribute('data-pid') || '';
        if (pid) { try { navigator.clipboard.writeText(pid); } catch(e){} }
      }
      if (open) {
        const pid = open.getAttribute('data-pid') || '';
        tryFocusPost(pid);
      }
    });
  }

  function closeModPanel(){
    const modal = document.getElementById('mod-reports-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (reportsUnsub) { try { reportsUnsub(); } catch(e){} reportsUnsub = null; }
  }

  window.openModPanel = function openModPanel(){
    const modal = document.getElementById('mod-reports-modal');
    if (!modal) { alert('Moderation panel not available.'); return; }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    ensureReportsListener();
    wireListActions();
  };

  document.addEventListener('DOMContentLoaded', function(){
    const modal = document.getElementById('mod-reports-modal');
    const closeBtn = document.getElementById('close-mod-reports');
    closeBtn?.addEventListener('click', (e)=>{ e.preventDefault(); closeModPanel(); });
    modal?.addEventListener('click', (e)=>{ if (e.target === modal) closeModPanel(); });
  });
})();
