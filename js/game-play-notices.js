// GlitchRealm - Game Play Notices
// Shows a mandatory warning modal before launching flagged games.
// Keyed by Firestore game_submissions document ID.
(function () {
    'use strict';

    var GAME_PLAY_NOTICES = {
        'YxnZNN7g1gT0ih5Q1wqo': {
            gameName: 'Spire Oath',
            heading: 'Before you play: Spire Oath',
            sections: [
                {
                    heading: 'Platform Security Advisory',
                    tone: 'advisory',
                    body: 'Verified Partner Notice: Spire Oath is verified on GlitchRealm and meets our core safety standards. It uses external servers (spireoath.com) for online accounts, so this temporary notice will stay up while the developer finishes a few minor security updates. GlitchRealm does not store your account details, so as a standard practice, do not reuse your main passwords on external sites.'
                },
                {
                    heading: 'Content Rating Warning',
                    tone: 'rating',
                    body: 'Content Rating: Teen (13+) Features dark fantasy themes and mild suggestive artwork on loading screens. Player discretion is advised.'
                }
            ],
            continueLabel: 'Continue to Game',
            cancelLabel: 'Cancel'
        }
    };

    var STYLE_ID = 'gr-play-notice-styles';
    var OVERLAY_ID = 'gr-play-notice-overlay';

    var overlayEl = null;
    var bodyEl = null;
    var headingEl = null;
    var continueBtn = null;
    var cancelBtn = null;
    var closeBtn = null;
    var pendingAction = null;
    var lastFocused = null;

    function hasNotice(gameId) {
        return !!(gameId && Object.prototype.hasOwnProperty.call(GAME_PLAY_NOTICES, gameId));
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.gr-play-notice-overlay{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,15,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',
            '.gr-play-notice-overlay.gr-open{display:flex;}',
            'body.gr-play-notice-open{overflow:hidden;}',
            '.gr-play-notice-panel{position:relative;width:100%;max-width:600px;max-height:min(90vh,640px);display:flex;flex-direction:column;background:linear-gradient(180deg,#0c1222 0%,#090d1a 100%);border:1px solid rgba(46,208,255,.35);border-radius:14px;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 24px 64px rgba(0,0,0,.65);color:#cdd7ec;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden;}',
            '.gr-play-notice-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(46,208,255,.18);background:rgba(46,208,255,.06);}',
            '.gr-play-notice-head h2{margin:0;font-size:1.05rem;font-weight:700;letter-spacing:.02em;color:#7fe4ff;}',
            '.gr-play-notice-x{flex-shrink:0;width:32px;height:32px;border:1px solid rgba(255,255,255,.15);border-radius:8px;background:transparent;color:#cdd7ec;font-size:1.2rem;line-height:1;cursor:pointer;}',
            '.gr-play-notice-x:hover{background:rgba(255,255,255,.08);}',
            '.gr-play-notice-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;}',
            '.gr-play-notice-section{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px 16px;background:rgba(255,255,255,.03);}',
            '.gr-play-notice-section h3{margin:0 0 8px;font-size:.95rem;font-weight:700;letter-spacing:.02em;text-transform:uppercase;display:flex;align-items:center;gap:8px;}',
            '.gr-play-notice-section p{margin:0;font-size:.92rem;line-height:1.55;color:#d6deee;}',
            '.gr-play-notice-section.advisory{border-color:rgba(251,191,36,.45);background:rgba(251,191,36,.05);}',
            '.gr-play-notice-section.advisory h3{color:#fbbf24;}',
            '.gr-play-notice-section.rating{border-color:rgba(244,114,182,.45);background:rgba(244,114,182,.05);}',
            '.gr-play-notice-section.rating h3{color:#f472b6;}',
            '.gr-play-notice-actions{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25);}',
            '.gr-play-notice-btn{padding:10px 18px;border-radius:10px;font-size:.92rem;font-weight:600;cursor:pointer;letter-spacing:.02em;}',
            '.gr-play-notice-cancel{background:transparent;border:1px solid rgba(255,255,255,.25);color:#cdd7ec;}',
            '.gr-play-notice-cancel:hover{background:rgba(255,255,255,.08);}',
            '.gr-play-notice-continue{background:linear-gradient(90deg,#22d3ee,#3b82f6);border:1px solid rgba(34,211,238,.5);color:#04121e;}',
            '.gr-play-notice-continue:hover{filter:brightness(1.1);}',
            '@media (max-width:480px){.gr-play-notice-actions{flex-direction:column;}.gr-play-notice-btn{width:100%;}}',
            '.gr-play-notice-overlay{user-select:text;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function buildOverlay() {
        if (overlayEl) return;
        injectStyles();
        overlayEl = document.createElement('div');
        overlayEl.id = OVERLAY_ID;
        overlayEl.className = 'gr-play-notice-overlay';
        overlayEl.setAttribute('role', 'dialog');
        overlayEl.setAttribute('aria-modal', 'true');
        overlayEl.setAttribute('aria-labelledby', 'gr-play-notice-heading');
        overlayEl.innerHTML =
            '<div class="gr-play-notice-panel" role="document">' +
            '  <div class="gr-play-notice-head">' +
            '    <h2 id="gr-play-notice-heading"></h2>' +
            '    <button type="button" class="gr-play-notice-x" aria-label="Close and cancel">&times;</button>' +
            '  </div>' +
            '  <div class="gr-play-notice-body"></div>' +
            '  <div class="gr-play-notice-actions">' +
            '    <button type="button" class="gr-play-notice-btn gr-play-notice-cancel"></button>' +
            '    <button type="button" class="gr-play-notice-btn gr-play-notice-continue"></button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(overlayEl);
        headingEl = overlayEl.querySelector('#gr-play-notice-heading');
        bodyEl = overlayEl.querySelector('.gr-play-notice-body');
        continueBtn = overlayEl.querySelector('.gr-play-notice-continue');
        cancelBtn = overlayEl.querySelector('.gr-play-notice-cancel');
        closeBtn = overlayEl.querySelector('.gr-play-notice-x');

        closeBtn.addEventListener('click', closeNotice);
        cancelBtn.addEventListener('click', closeNotice);
        overlayEl.addEventListener('click', function (e) {
            if (e.target === overlayEl) closeNotice();
        });
        overlayEl.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeNotice();
        });
        continueBtn.addEventListener('click', function () {
            var action = pendingAction;
            closeNotice();
            if (typeof action === 'function') action();
        });
    }

    function closeNotice() {
        if (!overlayEl) return;
        overlayEl.classList.remove('gr-open');
        pendingAction = null;
        document.body.classList.remove('gr-play-notice-open');
        if (lastFocused && typeof lastFocused.focus === 'function') {
            try { lastFocused.focus(); } catch (e) {}
        }
        lastFocused = null;
    }

    function showNotice(gameId, onProceed) {
        var notice = hasNotice(gameId) ? GAME_PLAY_NOTICES[gameId] : null;
        if (!notice) {
            if (typeof onProceed === 'function') onProceed();
            return;
        }
        buildOverlay();
        pendingAction = onProceed || null;
        headingEl.textContent = notice.heading;
        var html = '';
        notice.sections.forEach(function (section) {
            html +=
                '<section class="gr-play-notice-section ' + section.tone + '">' +
                '<h3>' + (section.tone === 'advisory' ? '\u26A0 ' : '') + escapeHtmlText(section.heading) + '</h3>' +
                '<p>' + escapeHtmlText(section.body) + '</p>' +
                '</section>';
        });
        bodyEl.innerHTML = html;
        cancelBtn.textContent = notice.cancelLabel || 'Cancel';
        continueBtn.textContent = notice.continueLabel || 'Continue to Game';
        lastFocused = document.activeElement;
        overlayEl.classList.add('gr-open');
        document.body.classList.add('gr-play-notice-open');
        try { continueBtn.focus(); } catch (e) {}
    }

    function escapeHtmlText(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    window.GRPlayNotices = {
        hasNotice: hasNotice,
        showNotice: showNotice,
        close: closeNotice
    };
})();
