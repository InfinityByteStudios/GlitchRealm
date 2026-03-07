// Maintenance Mode Check
// Runs early on every page. Reads site_config/maintenance from Firestore.
// If enabled, redirects non-bypassed users to /maintenance.html.
(async function () {
  'use strict';

  // Never redirect if already on the maintenance page
  if (location.pathname === '/maintenance.html') return;

  // Wait for firebase-core.js to finish initialising
  if (window.firebaseReady) {
    await window.firebaseReady;
  } else {
    // Fallback: wait for the event or a timeout
    await new Promise(resolve => {
      window.addEventListener('firebaseCoreReady', resolve, { once: true });
      setTimeout(resolve, 4000);
    });
  }

  const db = window.firebaseFirestore;
  if (!db) return;

  try {
    const { doc, getDoc } = await import(
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
    );

    const snap = await getDoc(doc(db, 'site_config', 'maintenance'));
    if (!snap.exists()) return;

    const data = snap.data();
    if (!data || !data.enabled) return;

    // Skip if maintenance has expired
    if (data.expiresAt) {
      const expires = data.expiresAt.toDate
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt);
      if (expires <= new Date()) return;
    }

    // Allow bypass for listed UIDs (devs / admins)
    const user =
      window.currentFirebaseUser ||
      (window.firebaseAuth && window.firebaseAuth.currentUser);
    const uid = user ? user.uid : null;
    if (Array.isArray(data.allowedUids) && uid && data.allowedUids.includes(uid))
      return;

    // Allow bypass for specific paths (e.g. admin pages)
    const path = location.pathname;
    if (
      Array.isArray(data.allowedPaths) &&
      data.allowedPaths.some(function (p) {
        return path.startsWith(p);
      })
    )
      return;

    // Redirect to the maintenance page (replace so back-button doesn't loop)
    location.replace(
      '/maintenance.html?from=' + encodeURIComponent(location.pathname)
    );
  } catch (err) {
    // Silently fail — never block the site if the check itself errors
    console.warn('[Maintenance Check] Error:', err);
  }
})();
