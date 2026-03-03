/**
 * GlitchRealm Cookie Consent Banner & Preferences Modal
 * Self-contained — injects its own HTML + CSS, no external dependencies.
 * Stores consent in localStorage under key "gr_cookie_consent".
 *
 * Exposes:
 *   window.openConsentManager()  — open the full preferences modal
 *   window.getCookieConsent()    — returns stored consent object or null
 */
(function () {
  'use strict';

  /* guard against double-execution (footer.html + direct tag) */
  if (window.__grCookieConsentLoaded) return;
  window.__grCookieConsentLoaded = true;

  /* ── constants ─────────────────────────────────────────── */
  var STORAGE_KEY = 'gr_cookie_consent';
  var CONSENT_VERSION = 1;

  /* ── helpers ───────────────────────────────────────────── */
  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (obj && obj.version === CONSENT_VERSION) return obj;
      return null;
    } catch (e) { return null; }
  }

  function saveConsent(analytics, advertising) {
    var obj = {
      version: CONSENT_VERSION,
      essential: true,
      analytics: !!analytics,
      advertising: !!advertising,
      timestamp: new Date().toISOString()
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) { /* quota */ }
    return obj;
  }

  /* ── expose global helpers ─────────────────────────────── */
  window.getCookieConsent = getConsent;

  /* ── inject styles ─────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* -- banner bar ------------------------------------------------- */
    '#gr-cookie-bar{',
      'position:fixed;bottom:0;left:0;right:0;z-index:100000;',
      'background:rgba(10,10,10,.97);border-top:1px solid rgba(0,255,249,.25);',
      'padding:14px 24px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;',
      'font-family:Rajdhani,sans-serif;font-size:.95rem;color:#ccc;',
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      'transform:translateY(100%);opacity:0;transition:transform .35s ease,opacity .35s ease;',
    '}',
    '#gr-cookie-bar.visible{transform:translateY(0);opacity:1;}',
    '#gr-cookie-bar a{color:#00fff9;text-decoration:underline;}',
    '#gr-cookie-bar button{',
      'border:none;border-radius:6px;padding:8px 18px;cursor:pointer;font-family:inherit;font-weight:600;font-size:.9rem;transition:background .2s,box-shadow .2s;',
    '}',
    '#gr-cb-accept{background:#00fff9;color:#0a0a0a;}',
    '#gr-cb-accept:hover{box-shadow:0 0 12px rgba(0,255,249,.5);}',
    '#gr-cb-reject{background:transparent;color:#00fff9;border:1px solid #00fff9;}',
    '#gr-cb-reject:hover{background:rgba(0,255,249,.1);}',
    '#gr-cb-prefs{background:transparent;color:#aaa;border:1px solid #444;}',
    '#gr-cb-prefs:hover{border-color:#00fff9;color:#00fff9;}',

    /* -- modal overlay ---------------------------------------------- */
    '#gr-consent-overlay{',
      'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.75);',
      'display:none;align-items:center;justify-content:center;padding:20px;',
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
    '}',
    '#gr-consent-overlay.open{display:flex;}',

    /* -- modal ------------------------------------------------------ */
    '#gr-consent-modal{',
      'background:#0e1117;border:1px solid rgba(0,255,249,.3);border-radius:14px;',
      'max-width:480px;width:100%;padding:28px 26px;color:#ddd;font-family:Rajdhani,sans-serif;',
      'box-shadow:0 0 40px rgba(0,255,249,.08);max-height:90vh;overflow-y:auto;',
    '}',
    '#gr-consent-modal h2{',
      'margin:0 0 6px;font-size:1.35rem;color:#00fff9;font-family:Orbitron,monospace;letter-spacing:1px;',
    '}',
    '#gr-consent-modal p.subtitle{margin:0 0 18px;font-size:.88rem;color:#999;}',

    /* category rows */
    '.gr-cc-row{',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);',
    '}',
    '.gr-cc-row:last-of-type{border-bottom:none;}',
    '.gr-cc-label{font-weight:600;font-size:.98rem;}',
    '.gr-cc-desc{font-size:.82rem;color:#888;margin-top:2px;}',

    /* toggle switch */
    '.gr-toggle{position:relative;width:44px;height:24px;flex-shrink:0;cursor:pointer;}',
    '.gr-toggle input{opacity:0;width:0;height:0;}',
    '.gr-toggle .slider{',
      'position:absolute;inset:0;background:#333;border-radius:24px;transition:background .2s;',
    '}',
    '.gr-toggle .slider::after{',
      'content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;',
      'background:#888;border-radius:50%;transition:transform .2s,background .2s;',
    '}',
    '.gr-toggle input:checked + .slider{background:rgba(0,255,249,.25);}',
    '.gr-toggle input:checked + .slider::after{transform:translateX(20px);background:#00fff9;}',
    '.gr-toggle input:disabled + .slider{opacity:.5;cursor:not-allowed;}',

    /* modal buttons */
    '.gr-cc-actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;}',
    '.gr-cc-actions button{flex:1;min-width:110px;padding:10px 0;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:700;font-size:.92rem;transition:background .2s,box-shadow .2s;}',
    '#gr-cc-save{background:#00fff9;color:#0a0a0a;}',
    '#gr-cc-save:hover{box-shadow:0 0 14px rgba(0,255,249,.45);}',
    '#gr-cc-accept-all{background:transparent;color:#00fff9;border:1px solid #00fff9;}',
    '#gr-cc-accept-all:hover{background:rgba(0,255,249,.1);}',
    '#gr-cc-reject-all{background:transparent;color:#aaa;border:1px solid #444;}',
    '#gr-cc-reject-all:hover{border-color:#00fff9;color:#00fff9;}',

    /* responsive */
    '@media (max-width:540px){',
      '#gr-cookie-bar{flex-direction:column;text-align:center;padding:14px 16px;}',
      '.gr-cc-actions{flex-direction:column;}',
    '}'
  ].join('');
  document.head.appendChild(style);

  /* ── inject HTML ───────────────────────────────────────── */
  var wrapper = document.createElement('div');
  wrapper.innerHTML = [
    /* ---- bottom bar ---- */
    '<div id="gr-cookie-bar">',
      '<span>We use cookies to keep the site running and improve your experience. <a href="/cookie-policy">Learn more</a></span>',
      '<button id="gr-cb-accept">Accept All</button>',
      '<button id="gr-cb-reject">Reject Non-Essential</button>',
      '<button id="gr-cb-prefs">Preferences</button>',
    '</div>',

    /* ---- modal overlay ---- */
    '<div id="gr-consent-overlay" role="dialog" aria-label="Cookie preferences">',
      '<div id="gr-consent-modal">',
        '<h2>Cookie Preferences</h2>',
        '<p class="subtitle">Choose which cookies you allow. Essential cookies cannot be disabled.</p>',

        /* Essential */
        '<div class="gr-cc-row">',
          '<div>',
            '<div class="gr-cc-label">Essential</div>',
            '<div class="gr-cc-desc">Authentication, security & core site functionality.</div>',
          '</div>',
          '<label class="gr-toggle"><input type="checkbox" checked disabled><span class="slider"></span></label>',
        '</div>',

        /* Analytics */
        '<div class="gr-cc-row">',
          '<div>',
            '<div class="gr-cc-label">Analytics</div>',
            '<div class="gr-cc-desc">Anonymous usage stats to help us improve the platform.</div>',
          '</div>',
          '<label class="gr-toggle"><input type="checkbox" id="gr-cc-analytics"><span class="slider"></span></label>',
        '</div>',

        /* Advertising */
        '<div class="gr-cc-row">',
          '<div>',
            '<div class="gr-cc-label">Advertising</div>',
            '<div class="gr-cc-desc">Personalized ads that help fund GlitchRealm (e.g., Google AdSense).</div>',
          '</div>',
          '<label class="gr-toggle"><input type="checkbox" id="gr-cc-advertising"><span class="slider"></span></label>',
        '</div>',

        /* Actions */
        '<div class="gr-cc-actions">',
          '<button id="gr-cc-save">Save Preferences</button>',
          '<button id="gr-cc-accept-all">Accept All</button>',
          '<button id="gr-cc-reject-all">Reject All</button>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');

  document.body.appendChild(wrapper);

  /* ── DOM refs ──────────────────────────────────────────── */
  var bar          = document.getElementById('gr-cookie-bar');
  var overlay      = document.getElementById('gr-consent-overlay');
  var chkAnalytics = document.getElementById('gr-cc-analytics');
  var chkAds       = document.getElementById('gr-cc-advertising');

  /* ── actions ───────────────────────────────────────────── */
  function hideBar() { bar.classList.remove('visible'); }
  function showBar() { requestAnimationFrame(function () { bar.classList.add('visible'); }); }
  function openModal() {
    var c = getConsent();
    if (c) {
      chkAnalytics.checked = c.analytics;
      chkAds.checked       = c.advertising;
    }
    overlay.classList.add('open');
  }
  function closeModal() { overlay.classList.remove('open'); }

  function accept(analytics, advertising) {
    saveConsent(analytics, advertising);
    hideBar();
    closeModal();
  }

  /* ── event listeners ───────────────────────────────────── */
  document.getElementById('gr-cb-accept').addEventListener('click', function () { accept(true, true); });
  document.getElementById('gr-cb-reject').addEventListener('click', function () { accept(false, false); });
  document.getElementById('gr-cb-prefs').addEventListener('click', function () { openModal(); });

  document.getElementById('gr-cc-save').addEventListener('click', function () {
    accept(chkAnalytics.checked, chkAds.checked);
  });
  document.getElementById('gr-cc-accept-all').addEventListener('click', function () {
    chkAnalytics.checked = true;
    chkAds.checked = true;
    accept(true, true);
  });
  document.getElementById('gr-cc-reject-all').addEventListener('click', function () {
    chkAnalytics.checked = false;
    chkAds.checked = false;
    accept(false, false);
  });

  /* close modal on overlay click */
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  /* Escape key closes modal */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  /* ── expose global open function (footer "Manage Consent" link) ── */
  window.openConsentManager = function () {
    openModal();
  };

  /* ── boot: show bar if no consent stored ──────────────── */
  if (!getConsent()) {
    showBar();
  }
})();
