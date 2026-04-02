/**
 * GlitchRealm Legal Footer
 * Drop-in script for all officially affiliated GlitchRealm properties.
 * Usage: <script src="https://legal.glitchrealm.ca/legal-footer.js" defer></script>
 *
 * Injects a slim, self-styled legal attribution bar at the bottom of the page.
 * Does not depend on any external stylesheet or framework.
 */
(function () {
  'use strict';

  var LEGAL_BASE = 'https://legal.glitchrealm.ca';
  var STORAGE_KEY = 'gr.legalfooter.dismissed';

  // Don't inject on legal.glitchrealm.ca itself
  if (window.location.hostname === 'legal.glitchrealm.ca') return;

  var css = [
    '#gr-legal-bar{',
      'all:initial;',
      'display:block;',
      'width:100%;',
      'background:#0e0f11;',
      'border-top:1px solid rgba(255,255,255,0.08);',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:13px;',
      'line-height:1.5;',
      'color:#898c96;',
    '}',
    '#gr-legal-bar .gr-lb__inner{',
      'max-width:1100px;',
      'margin:0 auto;',
      'padding:.65rem 1.25rem;',
      'display:flex;',
      'align-items:center;',
      'justify-content:space-between;',
      'gap:.75rem;',
      'flex-wrap:wrap;',
    '}',
    '#gr-legal-bar .gr-lb__text{',
      'display:flex;',
      'align-items:center;',
      'gap:.5rem;',
      'flex-wrap:wrap;',
    '}',
    '#gr-legal-bar .gr-lb__badge{',
      'display:inline-flex;',
      'align-items:center;',
      'gap:.3rem;',
      'background:rgba(33,102,255,0.1);',
      'border:1px solid rgba(33,102,255,0.22);',
      'border-radius:999px;',
      'padding:.15rem .55rem;',
      'font-size:11px;',
      'font-weight:700;',
      'letter-spacing:.06em;',
      'text-transform:uppercase;',
      'color:#5b8fff;',
      'white-space:nowrap;',
    '}',
    '#gr-legal-bar a{',
      'color:#5b8fff;',
      'text-decoration:none;',
    '}',
    '#gr-legal-bar a:hover{',
      'text-decoration:underline;',
    '}',
    '#gr-legal-bar .gr-lb__links{',
      'display:flex;',
      'gap:.9rem;',
      'flex-wrap:wrap;',
      'align-items:center;',
    '}',
    '#gr-legal-bar .gr-lb__links a{',
      'font-size:12px;',
      'color:#5d6270;',
    '}',
    '#gr-legal-bar .gr-lb__links a:hover{color:#898c96;}',
    '#gr-legal-bar .gr-lb__dismiss{',
      'background:none;',
      'border:none;',
      'cursor:pointer;',
      'color:#5d6270;',
      'font-size:16px;',
      'line-height:1;',
      'padding:0 0 0 .25rem;',
    '}',
    '#gr-legal-bar .gr-lb__dismiss:hover{color:#898c96;}',
    '@media(max-width:520px){',
      '#gr-legal-bar .gr-lb__links{display:none;}',
    '}'
  ].join('');

  function inject() {
    // Only inject once
    if (document.getElementById('gr-legal-bar')) return;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = 'gr-legal-bar';
    bar.setAttribute('role', 'contentinfo');
    bar.setAttribute('aria-label', 'GlitchRealm legal affiliation');

    bar.innerHTML =
      '<div class="gr-lb__inner">' +
        '<div class="gr-lb__text">' +
          '<span class="gr-lb__badge">&#x2713; Official GlitchRealm Property</span>' +
          '<span>This site operates under <a href="' + LEGAL_BASE + '" target="_blank" rel="noopener">GlitchRealm Legal</a>.' +
          ' Where this site has its own Terms, those govern in any conflict.</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:.5rem">' +
          '<div class="gr-lb__links">' +
            '<a href="' + LEGAL_BASE + '/core.html" target="_blank" rel="noopener">Terms</a>' +
            '<a href="' + LEGAL_BASE + '/privacy.html" target="_blank" rel="noopener">Privacy</a>' +
            '<a href="' + LEGAL_BASE + '/affiliated.html" target="_blank" rel="noopener">Affiliated Sites</a>' +
          '</div>' +
          '<button class="gr-lb__dismiss" aria-label="Dismiss legal footer" title="Dismiss">&#x2715;</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(bar);

    bar.querySelector('.gr-lb__dismiss').addEventListener('click', function () {
      bar.style.display = 'none';
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
