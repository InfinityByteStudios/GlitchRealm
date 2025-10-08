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
  if(!user || !EDITOR_UIDS.includes(user.uid)){
    form.innerHTML = '<div style="padding:60px 30px; text-align:center; border:1px solid rgba(255,80,80,0.3); border-radius:14px; background:linear-gradient(135deg,#200, #400);"><h2 style="margin:0 0 10px; font-size:1.4rem; color:#ff9393;">Access Restricted</h2><p style="margin:0; font-size:.9rem; opacity:.8;">You must be an authorized editor to publish news.</p></div>';
    throw new Error('Not authorized');
  }
  
  // Update image upload access based on dev status
  updateImageUploadAccess(user);
}

async function publishArticle({ draft }){
  try {
    successMsg.style.display='none';
    errorMsg.style.display='none';

    const user = auth.currentUser;
    requireEditor(user);

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
      authorUsername: authorUsername || user.displayName || user.email?.split('@')[0] || 'Anonymous'
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

onAuthStateChanged(auth, (user) => {
  if(user && EDITOR_UIDS.includes(user.uid)){
    // Update image upload access for authorized users
    updateImageUploadAccess(user);
  } else if (user) {
    // Non-editor users: disable image upload
    updateImageUploadAccess(user);
  }
});
