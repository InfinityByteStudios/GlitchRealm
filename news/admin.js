import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, orderBy, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const db = getFirestore(window.firebaseApp);
const auth = getAuth(window.firebaseApp);

const DEV_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

// Check if user is admin/dev
function isAdmin(uid) {
  return DEV_UIDS.includes(uid);
}

// Require admin access
function requireAdmin(user) {
  if (!user || !isAdmin(user.uid)) {
    document.querySelector('.admin-wrap').innerHTML = `
      <div style="padding:80px 30px; text-align:center; border:1px solid rgba(255,80,80,0.3); border-radius:14px; background:linear-gradient(135deg,#200, #400);">
        <h2 style="margin:0 0 10px; font-size:1.6rem; color:#ff9393;">Access Denied</h2>
        <p style="margin:0; font-size:.95rem; opacity:.8;">You must be an administrator to access this page.</p>
      </div>
    `;
    throw new Error('Not authorized');
  }
}

// Tab switching
const tabButtons = document.querySelectorAll('.admin-tabs button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Status message helper
function showStatus(containerId, message, type = 'success') {
  const statusEl = document.getElementById(containerId);
  statusEl.textContent = message;
  statusEl.className = `status-msg ${type}`;
  statusEl.style.display = 'block';
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

// Load verified writers
async function loadVerifiedWriters() {
  try {
    const writersSnap = await getDocs(collection(db, 'verified_writers'));
    const writers = [];
    
    for (const docSnap of writersSnap.docs) {
      const data = docSnap.data();
      writers.push({
        uid: docSnap.id,
        ...data
      });
    }
    
    renderWriters(writers);
  } catch (err) {
    console.error('Error loading writers:', err);
    document.getElementById('writers-list').innerHTML = `
      <div class="empty-state">
        <h3>Error Loading Writers</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// Render writers list
function renderWriters(writers) {
  const listEl = document.getElementById('writers-list');
  
  if (!writers.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <h3>No Verified Writers</h3>
        <p>Add verified writers using the "Add Writer" tab.</p>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = writers.map(w => `
    <div class="writer-card" data-uid="${w.uid}">
      <div class="writer-info">
        <h3>
          ${escapeHTML(w.displayName || w.email || w.uid)}
          <span class="badge">Verified Writer</span>
        </h3>
        <p>UID: ${w.uid}</p>
        ${w.verifiedAt ? `<p>Verified: ${formatDate(w.verifiedAt)}</p>` : ''}
        ${w.notes ? `<p style="margin-top:6px; font-style:italic;">${escapeHTML(w.notes)}</p>` : ''}
      </div>
      <div class="writer-actions">
        <button onclick="removeWriter('${w.uid}', '${escapeHTML(w.displayName || w.email || 'this writer')}')">Remove</button>
      </div>
    </div>
  `).join('');
}

// Search writers
document.getElementById('writer-search')?.addEventListener('input', async (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const cards = document.querySelectorAll('.writer-card');
  
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(searchTerm) ? 'flex' : 'none';
  });
});

// Remove writer
window.removeWriter = async function(uid, name) {
  if (!confirm(`Remove verified writer status from ${name}?\n\nThey will no longer be able to publish articles.`)) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, 'verified_writers', uid));
    showStatus('status-writers', `✓ Removed verified writer: ${name}`, 'success');
    loadVerifiedWriters();
  } catch (err) {
    console.error('Error removing writer:', err);
    showStatus('status-writers', `✗ Error: ${err.message}`, 'error');
  }
};

// Add writer form
document.getElementById('add-writer-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const identifier = document.getElementById('user-identifier').value.trim();
  const displayName = document.getElementById('display-name').value.trim();
  const notes = document.getElementById('notes').value.trim();
  
  if (!identifier) {
    showStatus('status-add', '✗ Please enter an email or UID', 'error');
    return;
  }
  
  try {
    // If identifier looks like email, we need to find the UID
    // For now, we'll assume it's a UID or ask them to use UID
    // TODO: Add Firebase Admin SDK call to lookup user by email
    
    let uid = identifier;
    
    // Check if this looks like an email
    if (identifier.includes('@')) {
      showStatus('status-add', '⚠ Email lookup not yet implemented. Please use the user\'s UID instead.\n\nFind UIDs in Firebase Console → Authentication → Users', 'error');
      return;
    }
    
    // Create/update verified writer document
    await setDoc(doc(db, 'verified_writers', uid), {
      verified: true,
      verifiedAt: serverTimestamp(),
      displayName: displayName || null,
      notes: notes || null,
      verifiedBy: auth.currentUser?.uid || null
    });
    
    showStatus('status-add', `✓ Successfully verified writer: ${displayName || uid}`, 'success');
    
    // Reset form
    e.target.reset();
    
    // Reload writers list
    loadVerifiedWriters();
    
  } catch (err) {
    console.error('Error adding writer:', err);
    showStatus('status-add', `✗ Error: ${err.message}`, 'error');
  }
});

// Load verification requests
async function loadVerificationRequests() {
  try {
    const requestsSnap = await getDocs(
      query(
        collection(db, 'writer_verification_requests'),
        orderBy('createdAt', 'desc')
      )
    );
    
    const requests = requestsSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    
    renderRequests(requests);
  } catch (err) {
    console.error('Error loading requests:', err);
    document.getElementById('requests-list').innerHTML = `
      <div class="empty-state">
        <h3>Error Loading Requests</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// Render verification requests
function renderRequests(requests) {
  const listEl = document.getElementById('requests-list');
  
  if (!requests.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <h3>No Pending Requests</h3>
        <p>Verification requests will appear here when users submit them.</p>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = requests.map(r => `
    <div class="request-card">
      <div class="request-header">
        <h3>${escapeHTML(r.displayName || r.email || 'Unknown User')}</h3>
        <span class="request-status ${r.status || 'pending'}">${(r.status || 'pending').toUpperCase()}</span>
      </div>
      <div class="request-body">
        <p><strong>UID:</strong> ${r.userId}</p>
        <p><strong>Email:</strong> ${escapeHTML(r.email || 'Not provided')}</p>
        <p><strong>Submitted:</strong> ${formatDate(r.createdAt)}</p>
        ${r.message ? `
          <p style="margin-top:12px;"><strong>Message:</strong></p>
          <div class="request-message">${escapeHTML(r.message)}</div>
        ` : ''}
      </div>
      ${r.status === 'pending' || !r.status ? `
        <div class="request-actions">
          <button class="approve" onclick="approveRequest('${r.id}', '${r.userId}', '${escapeHTML(r.displayName || r.email || 'User')}')">Approve</button>
          <button class="reject" onclick="rejectRequest('${r.id}', '${escapeHTML(r.displayName || r.email || 'User')}')">Reject</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Approve verification request
window.approveRequest = async function(requestId, userId, name) {
  if (!confirm(`Approve verification request from ${name}?`)) {
    return;
  }
  
  try {
    // Add to verified writers
    await setDoc(doc(db, 'verified_writers', userId), {
      verified: true,
      verifiedAt: serverTimestamp(),
      verifiedBy: auth.currentUser?.uid || null
    });
    
    // Update request status
    await updateDoc(doc(db, 'writer_verification_requests', requestId), {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: auth.currentUser?.uid || null
    });
    
    showStatus('status-requests', `✓ Approved: ${name}`, 'success');
    loadVerificationRequests();
    loadVerifiedWriters();
    
  } catch (err) {
    console.error('Error approving request:', err);
    showStatus('status-requests', `✗ Error: ${err.message}`, 'error');
  }
};

// Reject verification request
window.rejectRequest = async function(requestId, name) {
  const reason = prompt(`Reject verification request from ${name}?\n\nOptional: Enter a reason (will be stored for reference):`);
  
  if (reason === null) return; // User cancelled
  
  try {
    await updateDoc(doc(db, 'writer_verification_requests', requestId), {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: auth.currentUser?.uid || null,
      rejectionReason: reason || 'No reason provided'
    });
    
    showStatus('status-requests', `✓ Rejected: ${name}`, 'success');
    loadVerificationRequests();
    
  } catch (err) {
    console.error('Error rejecting request:', err);
    showStatus('status-requests', `✗ Error: ${err.message}`, 'error');
  }
};

// Utility functions
function escapeHTML(str = '') {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function formatDate(ts) {
  if (!ts) return 'Unknown';
  try {
    if (ts.toDate) return ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return new Date(ts).toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
}

// Initialize on auth state change
onAuthStateChanged(auth, async (user) => {
  try {
    requireAdmin(user);
    
    // Load initial data
    await Promise.all([
      loadVerifiedWriters(),
      loadVerificationRequests()
    ]);
    
  } catch (err) {
    console.error('Auth error:', err);
  }
});
