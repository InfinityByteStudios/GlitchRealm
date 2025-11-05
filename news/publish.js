import { SUPABASE_CONFIG } from './supabase-config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.1/+esm';
import { getFirestore, collection, addDoc, setDoc, doc, serverTimestamp, getDoc, Timestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { redirectToAuth } from './auth-sync.js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
const db = getFirestore(window.firebaseApp);
const auth = getAuth(window.firebaseApp);

// Check if we're in edit mode
const urlParams = new URLSearchParams(window.location.search);
const editArticleId = urlParams.get('edit');
let originalArticle = null;

const EDITOR_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3', 
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

// Check if user is admin/dev
function isDevUID(uid) {
  return EDITOR_UIDS.includes(uid);
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
    console.warn('Error checking verified writer status:', err);
    return false;
  }
}

const form = document.getElementById('publish-form');
const loadingCheck = document.getElementById('loading-check');
const publishHeader = document.querySelector('.publish-header');
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

// Initialize: hide form and show loading
if (form) form.style.display = 'none';
if (publishHeader) publishHeader.style.display = 'none';
if (loadingCheck) loadingCheck.style.display = 'block';

// Show the actual publish form (only for verified writers)
function showPublishForm() {
  if (loadingCheck) loadingCheck.style.display = 'none';
  if (publishHeader) {
    publishHeader.style.display = 'block';
    // Update header text if editing
    if (editArticleId) {
      const h1 = publishHeader.querySelector('h1');
      if (h1) h1.textContent = 'Edit Article';
    }
  }
  if (form) {
    // Restore original form HTML if it was replaced
    if (!form.querySelector('#title')) {
      form.innerHTML = `
        <div class="field">
          <label>Title</label>
          <input type="text" id="title" maxlength="140" required placeholder="GlitchRealm v1.2 Performance Update" />
        </div>
        <div class="field">
          <label>Summary / Intro</label>
          <textarea id="summary" maxlength="400" placeholder="Short overview (1–3 sentences) explaining the article focus." required></textarea>
          <small style="opacity:.6; font-size:.65rem;">Max 400 chars. Appears in listings.</small>
        </div>
        <div class="inline">
          <div class="field">
            <label>Categories (select multiple)</label>
            <select id="categories" multiple size="6">
              <option value="updates">Platform Update</option>
              <option value="patches">Patch Notes</option>
              <option value="games">Game Release</option>
              <option value="community">Community</option>
              <option value="devlogs">Dev Log</option>
              <option value="events">Event</option>
              <option value="esports">Esports</option>
            </select>
            <small style="opacity:.55; font-size:.6rem;">Hold CTRL / CMD to multi-select.</small>
          </div>
          <div class="field">
            <label>Tags (comma separated)</label>
            <input type="text" id="tags" placeholder="performance, backend, rollout" />
          </div>
        </div>
        <div class="field">
          <label>Cover Image (optional) <span id="image-badge" class="coming-soon-badge">Coming Soon</span></label>
          <input type="file" id="cover" accept="image/*" disabled />
          <small style="opacity:.55; font-size:.6rem;">Uploaded to Supabase storage bucket <code>news-media</code>. <span id="image-restriction-msg" style="color:#ff9393;">Image uploads currently restricted to developers.</span></small>
        </div>
        <div class="field">
          <label>Main Content (Markdown)</label>
          <textarea id="content" placeholder="## Overview\nDetails here..." required></textarea>
        </div>
        <div class="field">
          <label>External Video / Media Embed (optional)</label>
          <input type="text" id="embed" placeholder="YouTube / external embed link" />
          <small style="opacity:.6; font-size:.65rem;">Single embedded media (YouTube, etc.) that appears in the article.</small>
        </div>
        <div class="field">
          <label>Sources / Citations (optional)</label>
          <div style="display:flex; gap:12px; margin-bottom:8px; align-items:center;">
            <label style="font-size:.65rem; text-transform:none; color:#b8d4d8; margin:0;">Citation Format:</label>
            <select id="citationFormat" style="background:#08131b; border:1px solid #12313d; border-radius:8px; padding:6px 10px; color:#d7e5e8; font-size:.75rem; flex:1; max-width:200px;">
              <option value="apa">APA</option>
              <option value="mla">MLA</option>
              <option value="chicago">Chicago</option>
              <option value="simple">Simple (Title - URL)</option>
            </select>
          </div>
          <textarea id="sources" placeholder="Author|Title|URL|Year (optional)&#10;Example: Smith, J.|Gaming Trends 2025|https://example.com/article|2025" rows="4"></textarea>
          <small style="opacity:.6; font-size:.65rem;">One source per line. Format: <code>Author|Title|URL|Year</code> - Automatically formatted based on selected citation style.</small>
        </div>
        <div class="field">
          <label>Social Media (optional)</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
            <button type="button" class="social-quick-btn" data-platform="Discord" style="background:rgba(88,101,242,0.15); border:1px solid rgba(88,101,242,0.3); color:#7289da; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ Discord</button>
            <button type="button" class="social-quick-btn" data-platform="X (Twitter)" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.3); color:#fff; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ X</button>
            <button type="button" class="social-quick-btn" data-platform="Instagram" style="background:rgba(225,48,108,0.15); border:1px solid rgba(225,48,108,0.3); color:#e1306c; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ Instagram</button>
            <button type="button" class="social-quick-btn" data-platform="Reddit" style="background:rgba(255,69,0,0.15); border:1px solid rgba(255,69,0,0.3); color:#ff4500; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ Reddit</button>
            <button type="button" class="social-quick-btn" data-platform="Facebook" style="background:rgba(24,119,242,0.15); border:1px solid rgba(24,119,242,0.3); color:#1877f2; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ Facebook</button>
            <button type="button" class="social-quick-btn" data-platform="YouTube" style="background:rgba(255,0,0,0.15); border:1px solid rgba(255,0,0,0.3); color:#ff0000; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ YouTube</button>
            <button type="button" class="social-quick-btn" data-platform="Twitch" style="background:rgba(145,70,255,0.15); border:1px solid rgba(145,70,255,0.3); color:#9146ff; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ Twitch</button>
            <button type="button" class="social-quick-btn" data-platform="TikTok" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,0,80,0.3); color:#ff0050; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ TikTok</button>
            <button type="button" class="social-quick-btn" data-platform="LinkedIn" style="background:rgba(0,119,181,0.15); border:1px solid rgba(0,119,181,0.3); color:#0077b5; padding:6px 12px; border-radius:6px; font-size:.65rem; cursor:pointer; transition:all 0.2s;">+ LinkedIn</button>
          </div>
          <textarea id="socialLinks" placeholder="Discord|https://discord.gg/example&#10;X (Twitter)|https://twitter.com/glitchrealm&#10;Instagram|https://instagram.com/glitchrealm" rows="3"></textarea>
          <small style="opacity:.6; font-size:.65rem;">Click buttons above to add platforms, or type manually. Format: <code>Platform|URL</code></small>
        </div>
        <div class="field">
          <label>Related Links (optional)</label>
          <textarea id="links" placeholder="Game Page|https://glitchrealm.ca/games.html&#10;Patch Notes|https://example.com/patch" rows="3"></textarea>
          <small style="opacity:.6; font-size:.65rem;">One link per line. Format: <code>Link Title|URL</code> - General links displayed below social media.</small>
        </div>
        <div class="actions">
          <button type="submit" class="primary">Publish</button>
          <button type="button" id="save-draft" class="secondary">Save Draft</button>
        </div>
      `;
      
      // Re-attach event listeners
      const newForm = document.getElementById('publish-form');
      newForm?.addEventListener('submit', e => { e.preventDefault(); publishArticle({ draft:false }); });
      document.getElementById('save-draft')?.addEventListener('click', () => publishArticle({ draft:true }));
      
      // Re-attach social media quick-add button listeners
      const socialBtns = document.querySelectorAll('.social-quick-btn');
      const socialLinksTextarea = document.getElementById('socialLinks');
      
      socialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const platform = btn.getAttribute('data-platform');
          const currentValue = socialLinksTextarea.value.trim();
          
          // Check if platform already exists
          if (currentValue.toLowerCase().includes(platform.toLowerCase() + '|')) {
            return; // Already added
          }
          
          const newLine = currentValue ? '\n' : '';
          const placeholder = `${platform}|https://`;
          socialLinksTextarea.value = currentValue + newLine + placeholder;
          
          // Focus and position cursor at the end
          socialLinksTextarea.focus();
          socialLinksTextarea.setSelectionRange(socialLinksTextarea.value.length, socialLinksTextarea.value.length);
          
          // Visual feedback
          btn.style.opacity = '0.5';
          setTimeout(() => { btn.style.opacity = '1'; }, 200);
        });
        
        // Hover effect
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'translateY(-2px)';
          btn.style.boxShadow = '0 2px 8px rgba(0,255,249,0.2)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = 'none';
        });
      });
    }
    form.style.display = 'flex';
  }
}

// Initialize: show badge and disable upload by default (until we verify user is dev)
if (coverEl) coverEl.disabled = true;
if (imageBadge) imageBadge.style.display = 'inline-block';
if (imageRestrictionMsg) imageRestrictionMsg.style.display = 'inline';

function getSelectedCategories(){
  return Array.from(categoriesEl.selectedOptions).map(o=>o.value);
}

function updateImageUploadAccess(user) {
  const isDev = user && isDevUID(user.uid);
  
  // Get fresh element references
  const coverEl = document.getElementById('cover');
  const imageBadge = document.getElementById('image-badge');
  const imageRestrictionMsg = document.getElementById('image-restriction-msg');
  
  console.log('[Image Upload Access]', {
    user: user?.uid || 'not signed in',
    isDev,
    badgeElement: !!imageBadge,
    coverElement: !!coverEl
  });
  
  if (isDev) {
    // Enable image upload for developers
    if (coverEl) coverEl.disabled = false;
    if (imageBadge) imageBadge.style.display = 'none';
    if (imageRestrictionMsg) imageRestrictionMsg.style.display = 'none';
  } else {
    // Disable image upload for non-developers
    if (coverEl) coverEl.disabled = true;
    if (imageBadge) imageBadge.style.display = 'inline-block';
    if (imageRestrictionMsg) imageRestrictionMsg.style.display = 'inline';
  }
}

async function uploadCoverIfAny(){
  const coverEl = document.getElementById('cover');
  const file = coverEl?.files?.[0];
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

    // Get fresh element references (in case form HTML was replaced)
    const titleEl = document.getElementById('title');
    const summaryEl = document.getElementById('summary');
    const contentEl = document.getElementById('content');
    const categoriesEl = document.getElementById('categories');
    const tagsEl = document.getElementById('tags');
    const embedEl = document.getElementById('embed');
    const linksEl = document.getElementById('links');
    const socialLinksEl = document.getElementById('socialLinks');
    const sourcesEl = document.getElementById('sources');
    const citationFormatEl = document.getElementById('citationFormat');

    if(!titleEl.value.trim()) throw new Error('Title required');
    if(!summaryEl.value.trim()) throw new Error('Summary required');
    if(!contentEl.value.trim()) throw new Error('Content required');

    const coverUrl = await uploadCoverIfAny();
    
    // Get author username (use display name or email)
    const authorUsername = user.displayName || user.email?.split('@')[0] || 'Anonymous';
    
    // Get selected categories from fresh element reference
    const selectedCategories = Array.from(categoriesEl.selectedOptions).map(o=>o.value);
    
    // Parse social media links if provided (format: "Platform|URL" one per line)
    let socialLinksArray = [];
    if (socialLinksEl && socialLinksEl.value.trim()) {
      socialLinksArray = socialLinksEl.value.split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [platform, url] = line.split('|').map(s => s.trim());
          return platform && url ? { platform, url } : null;
        })
        .filter(Boolean)
        .slice(0, 10); // Max 10 social links
    }
    
    // Parse regular links if provided (format: "Title|URL" one per line)
    let linksArray = [];
    if (linksEl && linksEl.value.trim()) {
      linksArray = linksEl.value.split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [title, url] = line.split('|').map(s => s.trim());
          return title && url ? { title, url } : null;
        })
        .filter(Boolean)
        .slice(0, 10); // Max 10 links
    }
    
    // Parse sources/citations if provided (format: "Author|Title|URL|Year" one per line)
    let sourcesArray = [];
    let citationFormat = 'simple';
    if (sourcesEl && sourcesEl.value.trim()) {
      citationFormat = citationFormatEl?.value || 'simple';
      sourcesArray = sourcesEl.value.split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split('|').map(s => s.trim());
          const [author, title, url, year] = parts;
          return author && title && url ? { author, title, url, year: year || '' } : null;
        })
        .filter(Boolean)
        .slice(0, 20); // Max 20 sources
    }

    let payload;
    let docRef;
    
    if (editArticleId && originalArticle) {
      // EDIT MODE: Update existing article
      payload = {
        title: titleEl.value.trim(),
        summary: summaryEl.value.trim(),
        content: contentEl.value,
        categories: selectedCategories,
        tags: tagsEl.value.split(',').map(t=>t.trim()).filter(Boolean).slice(0,25),
        draft: !!draft,
        updatedAt: Timestamp.now(),
        lastEditedAt: Timestamp.now() // Mark as edited
      };

      // Add optional fields only if they have values
      if (coverUrl) {
        payload.coverImageUrl = coverUrl;
      } else if (originalArticle.coverImageUrl) {
        payload.coverImageUrl = originalArticle.coverImageUrl;
      }
      
      if (embedEl.value.trim()) {
        payload.embed = embedEl.value.trim();
      } else if (originalArticle.embed) {
        payload.embed = originalArticle.embed;
      }
      
      // Add links if provided (or preserve existing)
      if (linksArray.length > 0) {
        payload.links = linksArray;
      } else if (originalArticle.links && linksEl && !linksEl.value.trim()) {
        // Preserve existing links if field is empty
        payload.links = originalArticle.links;
      }
      
      // Add social links if provided (or preserve existing)
      if (socialLinksArray.length > 0) {
        payload.socialLinks = socialLinksArray;
      } else if (originalArticle.socialLinks && socialLinksEl && !socialLinksEl.value.trim()) {
        // Preserve existing social links if field is empty
        payload.socialLinks = originalArticle.socialLinks;
      }
      
      // Add sources if provided (or preserve existing)
      if (sourcesArray.length > 0) {
        payload.sources = sourcesArray;
        payload.citationFormat = citationFormat;
      } else if (originalArticle.sources && sourcesEl && !sourcesEl.value.trim()) {
        // Preserve existing sources if field is empty
        payload.sources = originalArticle.sources;
        payload.citationFormat = originalArticle.citationFormat || 'simple';
      }
      
      if (!draft && !originalArticle.publishedAt) {
        // Publishing for the first time
        payload.publishedAt = Timestamp.now();
      }

      console.log('[Update Debug] Payload:', JSON.stringify(payload, (k, v) => 
        v instanceof Timestamp ? v.toDate().toISOString() : v, 2
      ));

      await updateDoc(doc(db, 'news_articles', editArticleId), payload);
      
      successMsg.textContent = draft ? '✓ Draft updated successfully!' : '✓ Article updated successfully!';
    } else {
      // CREATE MODE: New article
      payload = {
        title: titleEl.value.trim(),
        summary: summaryEl.value.trim(),
        content: contentEl.value,
        categories: selectedCategories,
        tags: tagsEl.value.split(',').map(t=>t.trim()).filter(Boolean).slice(0,25),
        draft: !!draft,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        authorUid: user.uid,
        authorUsername: authorUsername || user.displayName || user.email?.split('@')[0] || 'Anonymous'
      };

      // Add optional fields only if they have values
      if (coverUrl) payload.coverImageUrl = coverUrl;
      if (embedEl.value.trim()) payload.embed = embedEl.value.trim();
      if (linksArray.length > 0) payload.links = linksArray;
      if (socialLinksArray.length > 0) payload.socialLinks = socialLinksArray;
      if (sourcesArray.length > 0) {
        payload.sources = sourcesArray;
        payload.citationFormat = citationFormat;
      }
      if (!draft) payload.publishedAt = Timestamp.now();

      console.log('[Publish Debug] Payload:', JSON.stringify(payload, (k, v) => 
        v instanceof Timestamp ? v.toDate().toISOString() : v, 2
      ));
      console.log('[Publish Debug] User:', { uid: user.uid, isDev: isDevUID(user.uid), isWriter: isWriter });

      docRef = await addDoc(collection(db,'news_articles'), payload);
      
      successMsg.textContent = draft ? '✓ Draft saved successfully!' : '✓ Article published successfully!';
    }

    // Show success message prominently
    successMsg.style.display='block';
    successMsg.style.animation = 'slideInRight 0.4s ease-out';
    
    // Reset form after short delay (get fresh form reference) - only for new articles
    if (!editArticleId) {
      setTimeout(() => {
        const currentForm = document.getElementById('publish-form');
        if (currentForm) currentForm.reset();
      }, 1500);
    }
    
    // Scroll to top to show success message
    window.scrollTo({top:0,behavior:'smooth'});
    
    // Hide success message after 6 seconds
    setTimeout(() => {
      successMsg.style.animation = 'slideOutRight 0.4s ease-in';
      setTimeout(() => {
        successMsg.style.display='none';
        successMsg.style.animation = '';
        
        // Redirect to article after update
        if (editArticleId) {
          window.location.href = `news-article.html?id=${editArticleId}`;
        }
      }, 400);
    }, 2000);

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

// Redirect non-verified users to verification request page
async function redirectToVerificationPage() {
  window.location.href = 'request-verification.html';
}

// Delete rejected request and allow resubmission (for backwards compatibility)
window.deleteAndResubmit = async function(userId) {
  window.location.href = 'request-verification.html';
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Not signed in - redirect to auth subdomain
    if (loadingCheck) loadingCheck.style.display = 'none';
    if (publishHeader) publishHeader.style.display = 'none';
    if (form) form.style.display = 'none';
    
    const container = document.querySelector('.publish-wrap');
    container.innerHTML = `
      <div style="padding:60px 30px; text-align:center; border:1px solid rgba(255,80,80,0.3); border-radius:14px; background:linear-gradient(135deg,#200, #400);">
        <h2 style="margin:0 0 10px; font-size:1.4rem; color:#ff9393;">Sign In Required</h2>
        <p style="margin:0 0 20px; font-size:.9rem; opacity:.8;">You must be signed in as a verified writer to publish news articles.</p>
        <button onclick="window.redirectToAuth?.()" style="display:inline-block; background:linear-gradient(90deg,#00fff9,#008cff); border:none; border-radius:30px; padding:14px 28px; font-size:.75rem; font-weight:700; letter-spacing:.7px; color:#02141c; cursor:pointer;">Sign In</button>
      </div>
    `;
    
    // Export redirectToAuth to window for onclick handler
    window.redirectToAuth = redirectToAuth;
    return;
  }
  
  // If editing, check if user is the author or a dev
  if (editArticleId) {
    try {
      const articleRef = doc(db, 'news_articles', editArticleId);
      const articleSnap = await getDoc(articleRef);
      
      if (!articleSnap.exists()) {
        throw new Error('Article not found');
      }
      
      originalArticle = articleSnap.data();
      
      // Check if user can edit this article
      const isDev = isDevUID(user.uid);
      const isAuthor = originalArticle.authorUid === user.uid;
      
      if (!isAuthor && !isDev) {
        window.location.href = 'index.html';
        return;
      }
    } catch (err) {
      console.error('Error loading article for edit:', err);
      alert('Error loading article: ' + err.message);
      window.location.href = 'index.html';
      return;
    }
  }
  
  // User is signed in - check verified writer status
  const isWriter = await isVerifiedWriter(user.uid);
  if (isWriter) {
    // Verified writer - show form
    showPublishForm();
    updateImageUploadAccess(user);
    
    // Load article data if editing
    if (editArticleId && originalArticle) {
      loadArticleDataIntoForm();
    }
  } else {
    // Non-verified users: redirect to verification request page
    window.location.href = 'request-verification.html';
  }
});

// Load article data into form for editing
function loadArticleDataIntoForm() {
  if (!originalArticle) return;
  
  const titleEl = document.getElementById('title');
  const summaryEl = document.getElementById('summary');
  const contentEl = document.getElementById('content');
  const categoriesEl = document.getElementById('categories');
  const tagsEl = document.getElementById('tags');
  const embedEl = document.getElementById('embed');
  const linksEl = document.getElementById('links');
  const socialLinksEl = document.getElementById('socialLinks');
  const sourcesEl = document.getElementById('sources');
  const citationFormatEl = document.getElementById('citationFormat');
  
  if (titleEl) titleEl.value = originalArticle.title || '';
  if (summaryEl) summaryEl.value = originalArticle.summary || '';
  if (contentEl) contentEl.value = originalArticle.content || '';
  if (embedEl) embedEl.value = originalArticle.embed || '';
  
  // Set regular links
  if (linksEl && originalArticle.links) {
    linksEl.value = originalArticle.links.map(link => `${link.title}|${link.url}`).join('\n');
  }
  
  // Set social media links
  if (socialLinksEl && originalArticle.socialLinks) {
    socialLinksEl.value = originalArticle.socialLinks.map(link => `${link.platform}|${link.url}`).join('\n');
  }
  
  // Set sources/citations
  if (sourcesEl && originalArticle.sources) {
    sourcesEl.value = originalArticle.sources.map(source => 
      `${source.author}|${source.title}|${source.url}${source.year ? '|' + source.year : ''}`
    ).join('\n');
  }
  
  // Set citation format
  if (citationFormatEl && originalArticle.citationFormat) {
    citationFormatEl.value = originalArticle.citationFormat;
  }
  
  // Set categories
  if (categoriesEl && originalArticle.categories) {
    Array.from(categoriesEl.options).forEach(option => {
      option.selected = originalArticle.categories.includes(option.value);
    });
  }
  
  // Set tags
  if (tagsEl && originalArticle.tags) {
    tagsEl.value = originalArticle.tags.join(', ');
  }
  
  // Update button text
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Update Article';
  
  const saveDraftBtn = document.getElementById('save-draft');
  if (saveDraftBtn) saveDraftBtn.textContent = 'Save as Draft';
}
