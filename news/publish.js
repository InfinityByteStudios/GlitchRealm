import { SUPABASE_CONFIG } from '../supabase-config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.1/+esm';
import { getFirestore, collection, addDoc, setDoc, doc, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getVerifiedUsername } from '../verified-user-helper.js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
const db = getFirestore(window.firebaseApp);
const auth = getAuth(window.firebaseApp);

const EDITOR_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

// Check if a user is a verified writer
async function isVerifiedWriter(uid) {
  try {
    const writerDoc = await getDoc(doc(db, 'verified_writers', uid));
    return writerDoc.exists() && writerDoc.data()?.verified === true;
  } catch (err) {
    console.warn('Error checking verified writer status:', err);
    return false;
  }
}

const form = document.getElementById('publish-form');
const titleEl = document.getElementById('title');
const summaryEl = document.getElementById('summary');
const categoriesEl = document.getElementById('categories');
const tagsEl = document.getElementById('tags');
const coverEl = document.getElementById('cover');
const contentEl = document.getElementById('content');
const embedEl = document.getElementById('embed');

const successMsg = document.getElementById('status-success');
const errorMsg = document.getElementById('status-error');
const saveDraftBtn = document.getElementById('save-draft');
const imageBadge = document.getElementById('image-badge');
const imageRestrictionMsg = document.getElementById('image-restriction-msg');

// Initialize: show badge and disable upload by default (until we verify user is dev)
if (coverEl) coverEl.disabled = true;
if (imageBadge) imageBadge.style.display = 'inline-block';
if (imageRestrictionMsg) imageRestrictionMsg.style.display = 'inline';

function getSelectedCategories(){
  return Array.from(categoriesEl.selectedOptions).map(o=>o.value);
}

function isDevUID(uid) {
  return EDITOR_UIDS.includes(uid);
}

function updateImageUploadAccess(user) {
  const isDev = user && isDevUID(user.uid);
  
  console.log('[Image Upload Access]', {
    user: user?.uid || 'not signed in',
    isDev,
    badgeElement: !!imageBadge,
    coverElement: !!coverEl
  });
  
  if (isDev) {
    // Enable image upload for developers
    coverEl.disabled = false;
    if (imageBadge) imageBadge.style.display = 'none';
    if (imageRestrictionMsg) imageRestrictionMsg.style.display = 'none';
  } else {
    // Disable image upload for non-developers
    coverEl.disabled = true;
    if (imageBadge) imageBadge.style.display = 'inline-block';
    if (imageRestrictionMsg) imageRestrictionMsg.style.display = 'inline';
  }
}

async function uploadCoverIfAny(){
  const file = coverEl.files?.[0];
  if(!file) return null;
  
  // Double-check: only devs can upload images
  const user = auth.currentUser;
  if (!user || !isDevUID(user.uid)) {
    throw new Error('Image uploads are restricted to developers');
  }
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const path = `covers/${fileName}`;
  const { error } = await supabase.storage.from('news-media').upload(path, file, { upsert:false, cacheControl:'3600' });
  if(error) throw error;
  const { data } = supabase.storage.from('news-media').getPublicUrl(path);
  return data.publicUrl;
}

function requireEditor(user){
  if(!user){
    form.innerHTML = '<div style="padding:60px 30px; text-align:center; border:1px solid rgba(255,80,80,0.3); border-radius:14px; background:linear-gradient(135deg,#200, #400);"><h2 style="margin:0 0 10px; font-size:1.4rem; color:#ff9393;">Access Restricted</h2><p style="margin:0; font-size:.9rem; opacity:.8;">You must be signed in as a verified writer to publish news.</p></div>';
    throw new Error('Not authenticated');
  }
  // We'll check verified writer status async in publishArticle
  
  // Update image upload access based on dev status
  updateImageUploadAccess(user);
}

async function publishArticle({ draft }){
  try {
    successMsg.style.display='none';
    errorMsg.style.display='none';

    const user = auth.currentUser;
    requireEditor(user);
    
    // Check if user is a verified writer
    const isWriter = await isVerifiedWriter(user.uid);
    if (!isWriter) {
      errorMsg.textContent = '✗ You must be a verified writer to publish articles. Contact an admin to get verified.';
      errorMsg.style.display='block';
      errorMsg.style.animation = 'shake 0.5s ease-in-out';
      window.scrollTo({top:0,behavior:'smooth'});
      setTimeout(() => {
        errorMsg.style.animation = '';
      }, 500);
      return;
    }

    if(!titleEl.value.trim()) throw new Error('Title required');
    if(!summaryEl.value.trim()) throw new Error('Summary required');
    if(!contentEl.value.trim()) throw new Error('Content required');

    const coverUrl = await uploadCoverIfAny();
    
    // Get the verified username for the author
    const authorUsername = await getVerifiedUsername(user.uid);

    const payload = {
      title: titleEl.value.trim(),
      summary: summaryEl.value.trim(),
      content: contentEl.value,
      categories: getSelectedCategories(),
      tags: tagsEl.value.split(',').map(t=>t.trim()).filter(Boolean).slice(0,25),
      coverImageUrl: coverUrl || null,
      embed: embedEl.value.trim() || null,
      draft: !!draft,
      publishedAt: draft ? null : serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      authorUid: user.uid,
      authorUsername: authorUsername || user.displayName || user.email?.split('@')[0] || 'Anonymous',
      isVerifiedWriter: true // Store badge status with article
    };

    const docRef = await addDoc(collection(db,'news_articles'), payload);

    // Show success message prominently
    successMsg.textContent = draft ? '✓ Draft saved successfully!' : '✓ Article published successfully!';
    successMsg.style.display='block';
    successMsg.style.animation = 'slideInRight 0.4s ease-out';
    
    // Reset form after short delay
    setTimeout(() => {
      form.reset();
    }, 1500);
    
    // Scroll to top to show success message
    window.scrollTo({top:0,behavior:'smooth'});
    
    // Hide success message after 6 seconds
    setTimeout(() => {
      successMsg.style.animation = 'slideOutRight 0.4s ease-in';
      setTimeout(() => {
        successMsg.style.display='none';
        successMsg.style.animation = '';
      }, 400);
    }, 6000);

  } catch(err){
    console.error('Publish error:', err);
    errorMsg.textContent = '✗ Error: ' + err.message;
    errorMsg.style.display='block';
    errorMsg.style.animation = 'shake 0.5s ease-in-out';
    window.scrollTo({top:0,behavior:'smooth'});
    setTimeout(() => {
      errorMsg.style.animation = '';
      errorMsg.style.display='none';
    }, 8000);
  }
}

form?.addEventListener('submit', e => { e.preventDefault(); publishArticle({ draft:false }); });
saveDraftBtn?.addEventListener('click', () => publishArticle({ draft:true }));

// Request verification modal
async function showRequestVerificationModal(user) {
  const existingRequest = await getDoc(doc(db, 'writer_verification_requests', user.uid));
  
  if (existingRequest.exists()) {
    const data = existingRequest.data();
    const status = data.status || 'pending';
    
    form.innerHTML = `
      <div style="padding:60px 30px; text-align:center; border:1px solid rgba(0,255,249,0.3); border-radius:14px; background:linear-gradient(135deg,#001a1a, #002020);">
        <h2 style="margin:0 0 10px; font-size:1.4rem; color:#00fff9;">Verification Request ${status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Reviewed'}</h2>
        <p style="margin:0 0 20px; font-size:.9rem; opacity:.8;">
          ${status === 'pending' ? 'Your request to become a verified writer is under review.' : 
            status === 'approved' ? 'Your request was approved! Refresh the page to access publishing.' :
            status === 'rejected' ? `Your request was not approved. ${data.rejectionReason ? 'Reason: ' + data.rejectionReason : ''}` : 'Status unknown.'}
        </p>
        ${status === 'rejected' ? '<button onclick="location.reload()" style="background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; color:#02141c; cursor:pointer;">Request Again</button>' : ''}
      </div>
    `;
    return;
  }
  
  form.innerHTML = `
    <div style="padding:60px 30px; text-align:center; border:1px solid rgba(255,180,80,0.3); border-radius:14px; background:linear-gradient(135deg,#1a1a00, #2a2010);">
      <h2 style="margin:0 0 10px; font-size:1.4rem; color:#ffb366;">Verified Writer Required</h2>
      <p style="margin:0 0 20px; font-size:.9rem; opacity:.8;">You must be a verified writer to publish news articles.</p>
      <button id="request-verification-btn" style="background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; letter-spacing:.7px; color:#02141c; cursor:pointer;">Request Verification</button>
    </div>
  `;
  
  document.getElementById('request-verification-btn')?.addEventListener('click', () => showRequestForm(user));
}

async function showRequestForm(user) {
  form.innerHTML = `
    <div style="max-width:600px; margin:0 auto; padding:40px 30px; border:1px solid rgba(0,255,249,0.3); border-radius:14px; background:linear-gradient(135deg,#001a1a, #002020);">
      <h2 style="margin:0 0 20px; font-size:1.6rem; color:#00fff9; text-align:center;">Request Writer Verification</h2>
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
          <textarea id="request-message" placeholder="Tell us about your writing experience, what you'd like to cover, etc." style="width:100%; min-height:120px; background:#08131b; border:1px solid #12313d; border-radius:10px; padding:12px 14px; color:#d7e5e8; font-size:.85rem; line-height:1.5; resize:vertical;"></textarea>
        </div>
        <div id="request-status-msg" style="display:none; margin-bottom:15px; padding:12px; border-radius:8px; font-size:.85rem; text-align:center;"></div>
        <div style="display:flex; gap:12px; justify-content:center;">
          <button type="submit" style="background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; letter-spacing:.7px; color:#02141c; cursor:pointer;">Submit Request</button>
          <button type="button" id="cancel-request-btn" style="background:rgba(255,80,80,0.12); border:1px solid rgba(255,80,80,0.4); color:#ff8080; border-radius:30px; padding:12px 24px; font-size:.7rem; letter-spacing:.6px; font-weight:600; cursor:pointer;">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('cancel-request-btn')?.addEventListener('click', () => location.reload());
  
  document.getElementById('verification-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusMsg = document.getElementById('request-status-msg');
    
    try {
      const displayName = document.getElementById('request-display-name').value.trim();
      const message = document.getElementById('request-message').value.trim();
      
      if (!displayName) {
        throw new Error('Display name is required');
      }
      
      // Create verification request
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

onAuthStateChanged(auth, async (user) => {
  if(user){
    // Check verified writer status
    const isWriter = await isVerifiedWriter(user.uid);
    if (isWriter) {
      // Update image upload access for verified writers
      updateImageUploadAccess(user);
    } else {
      // Non-writer users: show request verification option
      showRequestVerificationModal(user);
      updateImageUploadAccess(user);
    }
  }
});
