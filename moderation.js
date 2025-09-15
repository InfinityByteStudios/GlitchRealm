// Moderation page logic: list recent reports for authorized users
(function(){
  const API_BASE = 'https://us-central1-shared-sign-in.cloudfunctions.net/api';
  const auth = window.firebaseAuth;
  const accessEl = document.getElementById('mod-access');
  const controlsEl = document.getElementById('mod-reports-controls');
  const sourceEl = document.getElementById('mod-reports-source');
  const listEl = document.getElementById('mod-reports-list');
  // Verification panel elements
  const vControlsEl = document.getElementById('mod-verify-controls');
  const vListEl = document.getElementById('mod-verify-list');
  const vFilterEl = document.getElementById('mod-verify-filter');
  // Game submissions elements
  const gsControlsEl = document.getElementById('mod-gamesub-controls');
  const gsListEl = document.getElementById('mod-gamesub-list');
  const gsFilterEl = document.getElementById('mod-gamesub-filter');
  // Auto-delete window for CLOSED community reports (hours)
  // Requested behavior: delete after 24 hours when finalized/closed
  const AUTO_DELETE_TTL_HOURS = 24; // 24 hours
  let reportsUnsub = null;
  let countdownInterval = null;
  let vUnsub = null;
  let gsUnsub = null;

  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  function renderEmpty(msg){
    listEl.innerHTML = `<div style="opacity:.8; padding:8px;">${esc(msg)}</div>`;
  }

  function stopCountdowns(){
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  }

  function startCountdowns(){
    const els = listEl.querySelectorAll('.ttl-countdown[data-exp]');
    if (!els.length) return;
    const fmt = (ms) => {
      if (ms <= 0) return 'Deleting soon…';
      const totalSec = Math.floor(ms / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const pad = (n)=> String(n).padStart(2,'0');
      return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
    };
    // Initial tick
    const tick = () => {
      const now = Date.now();
      els.forEach(el => {
        const exp = Number(el.getAttribute('data-exp')) || 0;
        const ms = exp - now;
        el.textContent = `Auto-deletes in ${fmt(ms)}`;
        if (ms <= 0) {
          el.classList.add('expired');
        }
      });
    };
    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  function renderReportsList(snap){
    if (!snap || snap.empty) { renderEmpty('No reports found.'); return; }
    // Reset any existing countdown updater
    stopCountdowns();
    const rows = [];
    const now = new Date();
    const expiredIds = [];
    const needsTTL = [];
    snap.forEach(d => {
      const r = d.data();
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const reason = (r.reason || '').toString();
      const status = (r.status || 'open');
  const postId = r.postId || r.gameId || '';
      const statusChipClass = status === 'pending' ? 'status-chip status-pending' : (status === 'closed' ? 'status-chip status-closed' : 'status-chip status-open');
      let ttlNote = '';
      if (status === 'closed') {
        if (r.expiresAt?.toDate) {
          const dt = r.expiresAt.toDate();
          const ms = dt - now;
          if (ms <= 0) {
            expiredIds.push(d.id);
          } else {
            const expMs = dt.getTime();
            // Pre-format an immediate readable countdown string
            const totalSec = Math.floor(ms / 1000);
            const d = Math.floor(totalSec / 86400);
            const h = Math.floor((totalSec % 86400) / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            const pad = (n)=> String(n).padStart(2,'0');
            const initial = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
            const tooltip = dt.toLocaleString();
            const tooltipEsc = esc(tooltip);
            // Live countdown element (will be updated by interval)
            ttlNote = ` • <span class="ttl-countdown" data-exp="${expMs}" title="Deletes at ${tooltipEsc}">Auto-deletes in ${initial}</span>`;
          }
        } else {
          // Backfill TTL for older closed reports missing expiresAt
          needsTTL.push(d.id);
          ttlNote = ' • Scheduling auto-delete…';
        }
      }
      rows.push(`<div class="mod-report-row" data-rid="${esc(d.id)}">
        <div class="mrr-main">
          <div class="mrr-title">${esc(reason)}</div>
          <div class="mrr-meta">
            <span class="${statusChipClass}">Status: <strong>${esc(status)}</strong></span>
            • Post: <code>${esc(postId)}</code> • ${esc(when)}${ttlNote}
          </div>
          <div class="status-actions" style="margin-top:6px;">
            <button class="neural-button secondary sa-open" data-status="open"><span class="button-text">Mark Open</span></button>
            <button class="neural-button secondary sa-pending" data-status="pending"><span class="button-text">Mark Pending</span></button>
            <button class="neural-button secondary sa-closed" data-status="closed"><span class="button-text">Mark Closed</span></button>
          </div>
        </div>
        <div class="mrr-actions">
          <button class="neural-button secondary mrr-copy" data-pid="${esc(postId)}"><span class="button-text">Copy ID</span></button>
          ${r.postId ? `<a class="neural-button secondary" href="community.html?focus=${encodeURIComponent(postId)}"><span class="button-text">View in Community</span></a>` : ''}
          ${r.gameId ? `<a class="neural-button secondary" href="games.html#${encodeURIComponent(postId)}"><span class="button-text">View Game</span></a>` : ''}
        </div>
      </div>`);
    });
    listEl.innerHTML = rows.join('');
    // Best-effort cleanup for expired closed reports (requires delete permission)
    if (expiredIds.length) {
      (async () => {
        try {
          const f = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
          const db = f.getFirestore();
          const col = (sourceEl?.value === 'games') ? 'game_reports' : 'community_post_reports';
          await Promise.all(expiredIds.map(id => f.deleteDoc(f.doc(db, col, id))));
        } catch(err) { /* ignore */ }
      })();
    }
    // Backfill TTL scheduling for closed reports missing expiresAt
    if (needsTTL.length) {
      (async () => {
        try {
          const f = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
          const db = f.getFirestore();
          const expiresAt = f.Timestamp.fromMillis(Date.now() + AUTO_DELETE_TTL_HOURS*60*60*1000);
          const col = (sourceEl?.value === 'games') ? 'game_reports' : 'community_post_reports';
          await Promise.all(needsTTL.map(id => f.updateDoc(f.doc(db, col, id), { expiresAt })));
        } catch(err) { /* ignore */ }
      })();
    }
    // Start countdown updates if any
    startCountdowns();
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  function renderVerifyList(snap){
    if (!snap || snap.empty) {
      vListEl.innerHTML = '<div style="opacity:.8; padding:8px;">No requests.</div>';
      return;
    }
    const rows = [];
    snap.forEach(d => {
      const r = d.data();
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const status = r.status || 'pending';
      const links = Array.isArray(r.links) ? r.links : [];
      const bio = (r.bio || '').toString();
      rows.push(`<div class="mod-report-row" data-vid="${esc(d.id)}">
        <div class="mrr-main">
          <div class="mrr-title">${esc(r.displayName || d.id)}</div>
          <div class="mrr-meta">UID: <code>${esc(d.id)}</code> • ${esc(when)} • <span class="status-chip ${status === 'approved' ? 'status-closed' : (status === 'denied' ? 'status-pending' : 'status-open')}">Status: <strong>${esc(status)}</strong></span></div>
          ${bio ? `<div style="margin-top:6px; white-space:pre-wrap;">${esc(bio)}</div>` : ''}
          ${links.length ? `<div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">${links.map(u=>`<a class="neural-button secondary" href="${esc(u)}" target="_blank" rel="noopener">Link</a>`).join('')}</div>` : ''}
          <div class="status-actions" style="margin-top:8px;">
            <button class="neural-button secondary v-approve"><span class="button-text">Approve</span></button>
            <button class="neural-button secondary v-deny"><span class="button-text">Deny</span></button>
          </div>
        </div>
        <div class="mrr-actions">
          <button class="neural-button secondary v-copy" data-uid="${esc(d.id)}"><span class="button-text">Copy UID</span></button>
        </div>
      </div>`);
    });
    vListEl.innerHTML = rows.join('');
  }

  function renderGameSubmissionsList(snap){
    if (!gsListEl) return;
    if (!snap || snap.empty) {
      gsListEl.innerHTML = '<div style="opacity:.8; padding:8px;">No submissions.</div>';
      return;
    }
    const rows = [];
    snap.forEach(d => {
      const r = d.data();
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const status = r.status || 'draft';
      const title = (r.title || '').toString();
      const owner = (r.ownerId || '').toString();
      const desc = (r.description || '').toString();
      const cover = (r.coverImageUrl || '');
      const tags = Array.isArray(r.tags) ? r.tags : [];
  const playUrl = (r.playUrl || '').toString();
      rows.push(`<div class="mod-report-row" data-gsid="${esc(d.id)}">
        <div class="mrr-main">
          <div class="mrr-title">${esc(title)}</div>
          <div class="mrr-meta">Owner: <code>${esc(owner)}</code> • ${esc(when)} • <span class="status-chip ${status === 'published' ? 'status-closed' : 'status-open'}">Status: <strong>${esc(status)}</strong></span></div>
          ${cover ? `<div style="margin-top:6px;"><img src="${esc(cover)}" alt="cover" style="max-width:200px;border-radius:8px;border:1px solid rgba(255,255,255,.15)" loading="lazy"/></div>` : ''}
          ${desc ? `<div style="margin-top:6px; white-space:pre-wrap; opacity:.9;">${esc(desc)}</div>` : ''}
          ${tags.length ? `<div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">${tags.map(t=>`<span class="tag">#${esc(String(t))}</span>`).join('')}</div>` : ''}
          <div class="status-actions" style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
    ${playUrl ? `<a class="neural-button secondary" href="${esc(playUrl)}" target="_blank" rel="noopener"><span class="button-text">Test Play</span></a>` : ''}
            <button class="neural-button secondary gs-publish"><span class="button-text">Publish</span></button>
            <button class="neural-button secondary gs-unpublish"><span class="button-text">Unpublish</span></button>
            <button class="neural-button secondary gs-delete" style="color:#ff6b6b;"><span class="button-text">Delete</span></button>
          </div>
        </div>
      </div>`);
    });
    gsListEl.innerHTML = rows.join('');
  }

  function renderGameSubmissionsListFromArray(items){
    if (!gsListEl) return;
    if (!items || !items.length) {
      gsListEl.innerHTML = '<div style="opacity:.8; padding:8px;">No submissions.</div>';
      return;
    }
    const rows = [];
    items.forEach(it => {
      const r = it || {};
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const status = r.status || 'draft';
      const title = (r.title || '').toString();
      const owner = (r.ownerId || '').toString();
      const desc = (r.description || '').toString();
      const cover = (r.coverImageUrl || '');
      const tags = Array.isArray(r.tags) ? r.tags : [];
  const playUrl = (r.playUrl || '').toString();
      rows.push(`<div class="mod-report-row" data-gsid="${esc(r.id)}">
        <div class="mrr-main">
          <div class="mrr-title">${esc(title)}</div>
          <div class="mrr-meta">Owner: <code>${esc(owner)}</code> • ${esc(when)} • <span class="status-chip ${status === 'published' ? 'status-closed' : 'status-open'}">Status: <strong>${esc(status)}</strong></span></div>
          ${cover ? `<div style="margin-top:6px;"><img src="${esc(cover)}" alt="cover" style="max-width:200px;border-radius:8px;border:1px solid rgba(255,255,255,.15)" loading="lazy"/></div>` : ''}
          ${desc ? `<div style=\"margin-top:6px; white-space:pre-wrap; opacity:.9;\">${esc(desc)}</div>` : ''}
          ${tags.length ? `<div style=\"margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;\">${tags.map(t=>`<span class=\"tag\">#${esc(String(t))}</span>`).join('')}</div>` : ''}
          <div class="status-actions" style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
    ${playUrl ? `<a class="neural-button secondary" href="${esc(playUrl)}" target="_blank" rel="noopener"><span class="button-text">Test Play</span></a>` : ''}
            <button class="neural-button secondary gs-publish"><span class="button-text">Publish</span></button>
            <button class="neural-button secondary gs-unpublish"><span class="button-text">Unpublish</span></button>
            <button class="neural-button secondary gs-delete" style="color:#ff6b6b;"><span class="button-text">Delete</span></button>
          </div>
        </div>
      </div>`);
    });
    gsListEl.innerHTML = rows.join('');
  }

  async function ensureReportsListener(){
    if (!auth || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const DEV_UIDS = new Set([
      '6iZDTXC78aVwX22qrY43BOxDRLt1',
      'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
      'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
      '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
      'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
    ]);

    // Dev-only access for moderation page
    let allow = DEV_UIDS.has(uid);
    if (!allow) {
      accessEl.textContent = 'Access denied.';
      controlsEl.style.display = 'none';
      renderEmpty('');
      return;
    }

    // Capability-based: try a read to confirm
    try {
    const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const { getFirestore, collection, query, orderBy, limit, onSnapshot, getDocs, doc, updateDoc } = mod;
      const db = getFirestore();
      const buildQuery = () => {
        const src = sourceEl?.value === 'games' ? 'game_reports' : 'community_post_reports';
        return query(collection(db, src), orderBy('createdAt','desc'), limit(50));
      };
      let q = buildQuery();

  // No capability fallback; this page is dev-only.

  controlsEl.style.display = 'flex';
  vControlsEl.style.display = 'flex';
  gsControlsEl.style.display = 'flex';
      accessEl.textContent = 'Access granted.';
      if (reportsUnsub) { try { reportsUnsub(); } catch(e){} reportsUnsub = null; }
  reportsUnsub = onSnapshot(q, (snap) => renderReportsList(snap));

      // Wire actions
      document.getElementById('mod-refresh')?.addEventListener('click', async () => {
        try { const snap = await getDocs(q); renderReportsList(snap); } catch(e) {}
      });
      sourceEl?.addEventListener('change', () => {
        try {
          if (reportsUnsub) { try { reportsUnsub(); } catch(e){} reportsUnsub = null; }
          q = buildQuery();
          reportsUnsub = onSnapshot(q, (snap) => renderReportsList(snap));
        } catch(e) {}
      });

  // Verification requests query + handlers
      const vmod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const vdb = vmod.getFirestore();
      const buildVQuery = (filter) => {
        const base = vmod.collection(vdb, 'verification_requests');
        const f = (filter || 'pending');
        if (f === 'denied') {
          // Show ALL denied requests (no limit), ordered by newest first
          return vmod.query(base, vmod.where('status','==','denied'), vmod.orderBy('createdAt','desc'));
        }
        if (f === 'all') {
          return vmod.query(base, vmod.orderBy('createdAt','desc'), vmod.limit(50));
        }
        return vmod.query(base, vmod.where('status','==', f), vmod.orderBy('createdAt','desc'), vmod.limit(50));
      };
      const refreshV = async () => {
        try {
          const snap = await vmod.getDocs(buildVQuery(vFilterEl?.value || 'pending'));
          renderVerifyList(snap);
        } catch(e) { vListEl.innerHTML = '<div style="opacity:.8; padding:8px;">Failed to load.</div>'; }
      };
      if (vUnsub) { try { vUnsub(); } catch(e){} vUnsub = null; }
      vUnsub = vmod.onSnapshot(buildVQuery(vFilterEl?.value || 'pending'), (snap) => renderVerifyList(snap));
      document.getElementById('mod-verify-refresh')?.addEventListener('click', refreshV);
      vFilterEl?.addEventListener('change', () => {
        if (vUnsub) { try { vUnsub(); } catch(e){} vUnsub = null; }
        vUnsub = vmod.onSnapshot(buildVQuery(vFilterEl.value || 'pending'), (snap) => renderVerifyList(snap));
      });

      vListEl.addEventListener('click', (e) => {
        const copy = e.target.closest('.v-copy');
        if (copy) {
          const uid = copy.getAttribute('data-uid') || '';
          if (uid) { try { navigator.clipboard.writeText(uid); } catch(e){} }
          return;
        }
        const approve = e.target.closest('.v-approve');
        const deny = e.target.closest('.v-deny');
        if (approve || deny) {
          const row = e.target.closest('.mod-report-row');
          const uid = row?.getAttribute('data-vid');
          if (!uid) return;
          (async () => {
            try {
              const now = Date.now();
              const { getFirestore, doc, setDoc, updateDoc, serverTimestamp, Timestamp } = vmod;
              const db = getFirestore();
              if (approve) {
                // Create verified_users doc and mark request approved
                await setDoc(doc(db, 'verified_users', uid), {
                  verified: true,
                  verifiedAt: serverTimestamp(),
                  reviewerId: auth?.currentUser?.uid || null
                });
                await updateDoc(doc(db, 'verification_requests', uid), {
                  status: 'approved',
                  decidedAt: serverTimestamp(),
                  reviewerId: auth?.currentUser?.uid || null
                });
              } else if (deny) {
                await updateDoc(doc(db, 'verification_requests', uid), {
                  status: 'denied',
                  decidedAt: serverTimestamp(),
                  reviewerId: auth?.currentUser?.uid || null
                });
              }
            } catch(e) {
              const msg = (e && e.code === 'permission-denied') ? 'Permission denied. Ensure this account has admin/dev rights.' : 'Failed to update verification request.';
              alert(msg);
            }
          })();
        }
      });
      listEl.addEventListener('click', (e) => {
        const copy = e.target.closest('.mrr-copy');
        if (copy) {
          const pid = copy.getAttribute('data-pid') || '';
          if (pid) { try { navigator.clipboard.writeText(pid); } catch(e){} }
        }
        const saBtn = e.target.closest('.status-actions .neural-button');
        if (saBtn) {
          const row = e.target.closest('.mod-report-row');
          const rid = row?.getAttribute('data-rid');
          const newStatus = saBtn.getAttribute('data-status');
          if (!rid || !newStatus) return;
          // Only allow admins/moderators/devs (already checked), backend rules enforce update perms
      (async () => {
            try {
              const f = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
              const db = f.getFirestore();
              const col = (sourceEl?.value === 'games') ? 'game_reports' : 'community_post_reports';
              const dref = f.doc(db, col, rid);
              if (newStatus === 'closed') {
        const expiresAt = f.Timestamp.fromMillis(Date.now() + AUTO_DELETE_TTL_HOURS*60*60*1000);
                await f.updateDoc(dref, { status: 'closed', closedAt: f.serverTimestamp(), expiresAt });
              } else {
        await f.updateDoc(dref, { status: newStatus, closedAt: f.deleteField?.() ?? null, expiresAt: f.deleteField?.() ?? null });
              }
            } catch(e) {
              const msg = (e && e.code === 'permission-denied')
                ? 'You do not have permission to update report status. Ask an admin to grant moderator rights.'
                : 'Failed to update status.';
              alert(msg);
            }
          })();
        }
      });

      // Game submissions via backend API
      async function getIdToken(){ try { return await (auth?.currentUser?.getIdToken?.()); } catch { return null; } }
      async function loadSubmissions(){
        try {
          const token = await getIdToken();
          const status = gsFilterEl?.value || 'draft';
          const url = `${API_BASE}/submissions?limit=50&status=${encodeURIComponent(status)}`;
          const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (!res.ok) throw new Error('Failed');
          const items = await res.json();
          renderGameSubmissionsListFromArray(Array.isArray(items) ? items : []);
        } catch(e) { gsListEl.innerHTML = '<div style="opacity:.8; padding:8px;">Failed to load.</div>'; }
      }
      await loadSubmissions();
      document.getElementById('mod-gamesub-refresh')?.addEventListener('click', loadSubmissions);
      gsFilterEl?.addEventListener('change', loadSubmissions);
      gsListEl?.addEventListener('click', async (e) => {
        const row = e.target.closest('.mod-report-row');
        const id = row?.getAttribute('data-gsid');
        if (!id) return;
        try {
          const token = await getIdToken();
          if (!token) throw new Error('No token');
          if (e.target.closest('.gs-publish')) {
            await fetch(`${API_BASE}/submissions/${id}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
          } else if (e.target.closest('.gs-unpublish')) {
            await fetch(`${API_BASE}/submissions/${id}/unpublish`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
          } else if (e.target.closest('.gs-delete')) {
            if (!confirm('Delete this submission?')) return;
            await fetch(`${API_BASE}/submissions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          }
          await loadSubmissions();
        } catch (err) {
          alert('Failed to update submission.');
        }
      });
    } catch (e) {
      // Permission denied
      accessEl.innerHTML = 'You do not have permission to view moderation reports.';
      controlsEl.style.display = 'none';
      renderEmpty('');
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Auto-open behavior not needed here; this is the destination page
    if (auth) {
      auth.onAuthStateChanged((u) => {
        if (!u) {
          accessEl.textContent = 'Please sign in to access moderation.';
          renderEmpty('');
          return;
        }
        accessEl.textContent = 'Validating access…';
        ensureReportsListener();
      });
    } else {
      accessEl.textContent = 'Auth not available.';
      renderEmpty('');
    }
  });
})();
