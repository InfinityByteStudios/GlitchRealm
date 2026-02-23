import { getFirestore, doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
function isDevUID(uid) {
  return DEV_UIDS.includes(uid);
}

// Check if a user is a verified writer OR admin/dev
async function isVerifiedWriter(uid) {
  // Admins/devs always have access
  if (isDevUID(uid)) {
    return true;
  }
  
  // Check verified_writers collection
  try {
    const writerDoc = await getDoc(doc(db, 'verified_writers', uid));
    return writerDoc.exists() && writerDoc.data()?.verified === true;
  } catch (err) {
    console.error('Error checking verified writer status:', err);
    return false;
  }
}

// Delete rejected request and allow resubmission
window.deleteAndResubmit = async function(userId) {
  try {
    await deleteDoc(doc(db, 'writer_verification_requests', userId));
    location.reload();
  } catch (err) {
    console.error('Error deleting request:', err);
    alert('Failed to reset request. Please try again.');
  }
};

// Show the verification request form
function showRequestForm(user) {
  const container = document.getElementById('verification-content');
  
  container.innerHTML = `
    <h2 style="margin:0 0 24px; font-size:1.5rem; color:#00fff9; text-align:center;">Request Writer Verification</h2>
    <form id="verification-request-form">
      <div style="margin-bottom:20px;">
        <label style="display:block; margin-bottom:8px; font-size:.72rem; letter-spacing:.6px; font-weight:600; text-transform:uppercase; color:#7edcf0;">Email</label>
        <input type="text" value="${user.email || ''}" disabled style="width:100%; background:#08131b; border:1px solid #12313d; border-radius:10px; padding:12px 14px; color:#999; font-size:.85rem; opacity:0.6;">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block; margin-bottom:8px; font-size:.72rem; letter-spacing:.6px; font-weight:600; text-transform:uppercase; color:#7edcf0;">Display Name</label>
        <input type="text" id="request-display-name" required value="${user.displayName || ''}" placeholder="Your name" style="width:100%; background:#08131b; border:1px solid #12313d; border-radius:10px; padding:12px 14px; color:#d7e5e8; font-size:.85rem;">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block; margin-bottom:8px; font-size:.72rem; letter-spacing:.6px; font-weight:600; text-transform:uppercase; color:#7edcf0;">Why do you want to become a verified writer? (optional)</label>
        <textarea id="request-message" rows="4" placeholder="Tell us about your writing goals..." style="width:100%; background:#08131b; border:1px solid #12313d; border-radius:10px; padding:12px 14px; color:#d7e5e8; font-size:.85rem; resize:vertical;"></textarea>
      </div>
      <div id="request-status-msg" style="display:none; margin:0 0 16px; padding:14px; border-radius:10px; text-align:center; font-size:.8rem; font-weight:600;"></div>
      <button type="submit" style="width:100%; background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:16px 28px; font-size:.8rem; font-weight:700; letter-spacing:.7px; color:#02141c; cursor:pointer; text-transform:uppercase;">Submit Request</button>
    </form>
  `;
  
  const form = document.getElementById('verification-request-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const displayName = document.getElementById('request-display-name').value.trim();
    const message = document.getElementById('request-message').value.trim();
    const statusMsg = document.getElementById('request-status-msg');
    
    if (!displayName) {
      statusMsg.textContent = 'Please enter your display name.';
      statusMsg.style.display = 'block';
      statusMsg.style.background = 'rgba(255,100,100,0.15)';
      statusMsg.style.border = '2px solid rgba(255,100,100,0.5)';
      statusMsg.style.color = '#ff6d6d';
      return;
    }
    
    try {
      await setDoc(doc(db, 'writer_verification_requests', user.uid), {
        userId: user.uid,
        email: user.email || '',
        displayName,
        message: message || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      statusMsg.textContent = '✓ Request submitted successfully! Admins will review your request.';
      statusMsg.style.display = 'block';
      statusMsg.style.background = 'rgba(0,255,100,0.15)';
      statusMsg.style.border = '2px solid rgba(0,255,100,0.5)';
      statusMsg.style.color = '#58ff9c';
      
      setTimeout(() => location.reload(), 2000);
      
    } catch (err) {
      console.error('Error submitting request:', err);
      statusMsg.textContent = '✗ Error: ' + err.message;
      statusMsg.style.display = 'block';
      statusMsg.style.background = 'rgba(255,100,100,0.15)';
      statusMsg.style.border = '2px solid rgba(255,100,100,0.5)';
      statusMsg.style.color = '#ff6d6d';
    }
  });
}

// Show existing request status
function showRequestStatus(user, existingRequest) {
  const container = document.getElementById('verification-content');
  const data = existingRequest.data();
  const status = data.status || 'pending';
  
  container.innerHTML = `
    <div style="text-align:center; padding:40px 20px;">
      <div style="width:80px; height:80px; margin:0 auto 20px; border-radius:50%; background:${status === 'rejected' ? 'rgba(255,80,80,0.15)' : 'rgba(0,255,249,0.15)'}; border:3px solid ${status === 'rejected' ? 'rgba(255,80,80,0.4)' : 'rgba(0,255,249,0.4)'}; display:flex; align-items:center; justify-content:center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${status === 'rejected' ? '#ff6b6b' : '#00fff9'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${status === 'rejected' 
            ? '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
            : '<polyline points="20 6 9 17 4 12"></polyline>'}
        </svg>
      </div>
      <h2 style="margin:0 0 10px; font-size:1.4rem; color:${status === 'rejected' ? '#ff6b6b' : '#00fff9'};">
        ${status === 'pending' ? 'Request Pending' : status === 'approved' ? 'Request Approved!' : 'Request Denied'}
      </h2>
      <p style="margin:0 0 20px; font-size:.9rem; opacity:.8; max-width:480px; margin-left:auto; margin-right:auto;">
        ${status === 'pending' ? 'Your verification request is currently under review by our team. You\'ll be notified once a decision is made.' : 
          status === 'approved' ? 'Congratulations! Your writer verification has been approved. You can now publish news articles.' :
          `Your verification request was denied.${data.rejectionReason ? '<br/><strong style="color:#ff9393;">Reason:</strong> ' + data.rejectionReason : ''}`}
      </p>
      ${status === 'approved' ? '<a href="publish.html" style="display:inline-block; background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; color:#02141c; cursor:pointer; text-transform:uppercase; letter-spacing:0.5px; text-decoration:none;">Go to Publish</a>' : ''}
      ${status === 'rejected' ? '<button onclick="deleteAndResubmit(\'' + user.uid + '\')" style="background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; color:#02141c; cursor:pointer; text-transform:uppercase; letter-spacing:0.5px;">Resubmit Request</button>' : ''}
    </div>
  `;
}

// Show already verified message
function showAlreadyVerified() {
  const container = document.getElementById('verification-content');
  
  container.innerHTML = `
    <div style="text-align:center; padding:40px 20px;">
      <div style="width:80px; height:80px; margin:0 auto 20px; border-radius:50%; background:rgba(0,255,100,0.15); border:3px solid rgba(0,255,100,0.4); display:flex; align-items:center; justify-content:center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00ff65" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h2 style="margin:0 0 10px; font-size:1.4rem; color:#00ff65;">Already Verified!</h2>
      <p style="margin:0 0 20px; font-size:.9rem; opacity:.8;">You're already a verified writer. You can publish news articles anytime.</p>
      <a href="publish.html" style="display:inline-block; background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; color:#02141c; cursor:pointer; text-transform:uppercase; letter-spacing:0.5px; text-decoration:none;">Go to Publish</a>
    </div>
  `;
}

// Show not signed in message
function showSignInRequired() {
  const container = document.getElementById('verification-content');
  
  container.innerHTML = `
    <div style="text-align:center; padding:40px 20px;">
      <h2 style="margin:0 0 10px; font-size:1.4rem; color:#ff9393;">Sign In Required</h2>
      <p style="margin:0 0 20px; font-size:.9rem; opacity:.8;">You must be signed in to request writer verification.</p>
      <a href="https://auth.glitchrealm.ca" style="display:inline-block; background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; letter-spacing:.7px; color:#02141c; text-decoration:none; cursor:pointer; text-transform:uppercase;">Sign In</a>
    </div>
  `;
}

// Initialize
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showSignInRequired();
    return;
  }
  
  // Check if already verified
  const isWriter = await isVerifiedWriter(user.uid);
  if (isWriter) {
    showAlreadyVerified();
    return;
  }
  
  // Check for existing request
  const existingRequest = await getDoc(doc(db, 'writer_verification_requests', user.uid));
  
  if (existingRequest.exists()) {
    showRequestStatus(user, existingRequest);
  } else {
    showRequestForm(user);
  }
});
